import {
  Project,
  StructureKind,
  InterfaceDeclarationStructure,
  OptionalKind,
  PropertySignatureStructure,
  ClassDeclaration,
} from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

const MODULES_DIR = 'src/modules';
const OUTPUT_DIR = '.generate-types';

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });

function extractPropsFromClass(
  cls: ClassDeclaration,
  filterKeys?: string[],
  omitKeys?: string[],
): PropertySignatureStructure[] {
  return cls
    .getProperties()
    .filter((p) => {
      const name = p.getName();
      if (filterKeys && !filterKeys.includes(name)) return false;
      if (omitKeys && omitKeys.includes(name)) return false;
      return true;
    })
    .map((p) => ({
      kind: StructureKind.PropertySignature,
      name: p.getName(),
      type: p.getType().getText(p),
      hasQuestionToken: p.hasQuestionToken(),
    }));
}

function resolveDTOExtends(cls: ClassDeclaration): string[] {
  const heritage = cls.getHeritageClauses();
  const extendTypes: string[] = [];

  heritage.forEach((h) => {
    h.getTypeNodes().forEach((typeNode) => {
      const txt = typeNode.getText();

      // Convert Nest helper to TypeScript equivalents
      const matchIntersection = txt.match(/IntersectionType\((.+?)\)/);
      if (matchIntersection) {
        const inner = matchIntersection[1];

        const parts = inner.split(',').map((s) => s.trim());
        if (parts.length === 1) {
          // IntersectionType(CreateUserDto)
          extendTypes.push(parts[0]);
        } else {
          // IntersectionType(A, B) → extend both
          extendTypes.push(...parts);
        }
        return;
      }

      const matchPartial = txt.match(/PartialType\((.+?)\)/);
      if (matchPartial) {
        extendTypes.push(`Partial<${matchPartial[1]}>`);
        return;
      }

      const matchPick = txt.match(/PickType\((.+?),\s*(.+?)\)/);
      if (matchPick) {
        const typeName = matchPick[1];
        const rawKeys = matchPick[2];

        // Chuyển ['a', 'b'] → 'a' | 'b'
        const keys = rawKeys
          .replace(/^\[|\]$/g, '') // remove [ and ]
          .split(',')
          .map((s) => s.trim().replace(/^['"`]|['"`]$/g, '')) // remove quotes
          .filter(Boolean)
          .map((s) => `'${s}'`)
          .join(' | ');

        extendTypes.push(`Pick<${typeName}, ${keys}>`);
        return;
      }

      const matchOmit = txt.match(/OmitType\((.+?),\s*(.+?)\)/);
      if (matchOmit) {
        const typeName = matchOmit[1];
        const rawKeys = matchOmit[2];

        const keys = rawKeys
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
          .filter(Boolean)
          .map((s) => `'${s}'`)
          .join(' | ');

        extendTypes.push(`Omit<${typeName}, ${keys}>`);
        return;
      }

      extendTypes.push(txt);
    });
  });

  return extendTypes;
}

function normalizeInterfaces<T extends InterfaceDeclarationStructure>(
  structures: OptionalKind<T>[],
): T[] {
  return structures.map((s) => ({ ...s, kind: StructureKind.Interface })) as any;
}

function generateAll() {
  const modules = fs
    .readdirSync(MODULES_DIR)
    .filter((name) => fs.statSync(path.join(MODULES_DIR, name)).isDirectory());

  modules.forEach((moduleName) => {
    generateTypesForModule(moduleName);
    Logger.log(`✅ Generated: ${moduleName}`);
  });
}

export function generateTypesForModule(moduleName: string) {
  const modulePath = path.join(MODULES_DIR, moduleName);
  const dtoDir = path.join(modulePath, 'dtos');
  const entityDir = path.join(modulePath, 'entities');
  const controllerDir = path.join(modulePath, 'controllers');
  const extraInterfaceFile = path.join(modulePath, `${moduleName}.interface.ts`);

  const outputDir = path.join(OUTPUT_DIR, moduleName);
  fs.mkdirSync(outputDir, { recursive: true });

  const enumFiles = fs.readdirSync(modulePath).filter((f) => f.endsWith('.enum.ts'));
  const enumImports: string[] = [];
  const enumContents: string[] = [];

  for (const file of enumFiles) {
    const content = fs.readFileSync(path.join(modulePath, file), 'utf-8');
    const cleaned = content.replace(/^\/\/ From .*\n/gm, '').trim();
    enumContents.push(cleaned);

    const tempFile = project.createSourceFile('__temp_enum__.ts', content, { overwrite: true });
    const enums = tempFile.getEnums();
    const enumNames = enums.map((e) => e.getName());
    if (enumNames.length > 0) {
      enumImports.push(`import { ${enumNames.join(', ')} } from './${moduleName}.enum';`);
    }
  }

  fs.writeFileSync(path.join(outputDir, `${moduleName}.enum.ts`), enumContents.join('\n\n'));

  const interfaceStructures: OptionalKind<InterfaceDeclarationStructure>[] = [];
  const dtoFiles = fs.existsSync(dtoDir)
    ? fs.readdirSync(dtoDir).filter((f) => f.endsWith('.dto.ts'))
    : [];

  for (const file of dtoFiles) {
    const source = project.addSourceFileAtPath(path.join(dtoDir, file));
    source.getClasses().forEach((cls) => {
      const name = cls.getName();
      const extensions = resolveDTOExtends(cls);
      const fields = extractPropsFromClass(cls);

      // Nếu không có field nào, nhưng vẫn có extends → tạo interface rỗng kế thừa
      if (!fields.length && extensions.length) {
        interfaceStructures.push({
          kind: StructureKind.Interface,
          name: name!,
          isExported: true,
          extends: extensions,
          properties: [],
        });
      }

      // Nếu có field → tạo bình thường
      if (fields.length) {
        interfaceStructures.push({
          kind: StructureKind.Interface,
          name: name!,
          isExported: true,
          extends: extensions,
          properties: fields,
        });
      }
    });
  }

  if (fs.existsSync(extraInterfaceFile)) {
    const source = project.addSourceFileAtPath(extraInterfaceFile);
    source.getInterfaces().forEach((iFace) => interfaceStructures.push(iFace.getStructure()));
  }

  const interfaceSource = project.createSourceFile(
    path.join(outputDir, `${moduleName}.interface.ts`),
    { statements: normalizeInterfaces(interfaceStructures) },
    { overwrite: true },
  );
  if (enumImports.length) interfaceSource.insertText(0, enumImports.join('\n') + '\n\n');
  interfaceSource.saveSync();

  const entityInterfaces: OptionalKind<InterfaceDeclarationStructure>[] = [];
  const entityFiles = fs.existsSync(entityDir)
    ? fs.readdirSync(entityDir).filter((f) => f.endsWith('.entity.ts'))
    : [];

  for (const file of entityFiles) {
    const source = project.addSourceFileAtPath(path.join(entityDir, file));
    source.getClasses().forEach((cls) => {
      entityInterfaces.push({
        kind: StructureKind.Interface,
        name: cls.getName()!,
        isExported: true,
        extends: ['BaseEntity'],
        properties: cls.getProperties().map((p) => ({
          kind: StructureKind.PropertySignature,
          name: p.getName(),
          type: p.getType().getText(p),
          hasQuestionToken: p.hasQuestionToken(),
        })),
      });
    });
  }

  const entitySource = project.createSourceFile(
    path.join(outputDir, `${moduleName}.entities.ts`),
    { statements: normalizeInterfaces(entityInterfaces) },
    { overwrite: true },
  );
  if (enumImports.length) entitySource.insertText(0, enumImports.join('\n') + '\n\n');
  entitySource.saveSync();

  const controllerFiles = fs.existsSync(controllerDir)
    ? fs.readdirSync(controllerDir).filter((f) => f.endsWith('.controller.ts'))
    : [];

  const apiFunctions: string[] = [
    `import { axiosRequest } from '../../common/config';`,
    `import { ResList } from '../../common/interfaces/res-list.interface';\n`,
  ];

  for (const file of controllerFiles) {
    const controllerSource = project.addSourceFileAtPath(path.join(controllerDir, file));
    const controllerClass = controllerSource.getClass(() => true);
    if (!controllerClass) continue;

    const routePrefix =
      controllerClass
        .getDecorator('Route')
        ?.getArguments()?.[0]
        ?.getText()
        ?.replace(/['"`]/g, '') || moduleName;

    controllerClass.getMethods().forEach((method) => {
      const methodName = method.getName();
      const decorator = method
        .getDecorators()
        .find((d) => ['Get', 'Post', 'Put', 'Patch', 'Delete'].includes(d.getName()));
      if (!decorator) return;

      const httpMethod = decorator.getName().toLowerCase();
      const rawPath = decorator.getArguments()?.[0]?.getText()?.replace(/['"`]/g, '') || '';
      const fullPath = rawPath
        ? `${routePrefix}/${rawPath}`
            .replace(/\/\/+/g, '/')
            .replace(/:([a-zA-Z0-9_]+)/g, (_, p1) => `\$\{${p1}\}`)
        : routePrefix;

      const params = method.getParameters();
      const paramArg = params.find((p) => p.getDecorator('Param'));
      const bodyArg = params.find((p) => p.getDecorator('Body'));
      const queryArg = params.find((p) => p.getDecorator('Query'));

      const paramDecoratorArg = paramArg?.getDecorator('Param')?.getArguments()?.[0];
      const paramName = paramDecoratorArg?.getText()?.replace(/['"`]/g, '') || paramArg?.getName();

      const dtoType = bodyArg?.getTypeNode()?.getText() ?? queryArg?.getTypeNode()?.getText() ?? '';

      const args = [
        paramArg ? `${paramName}: string` : null,
        dtoType ? `${bodyArg ? 'body' : 'params'}: ${dtoType}` : null,
      ].filter(Boolean);

      const reqArgs = [bodyArg ? 'body' : queryArg ? '{ params }' : null].filter(Boolean);

      // Suy luận tên entity từ methodName
      let entityName = methodName.replace(/^getList|^get/, '');
      entityName = entityName.charAt(0).toUpperCase() + entityName.slice(1);

      let returnType = '';
      if (/getList/i.test(methodName)) returnType = `: Promise<ResList<${entityName}>>`;
      else if (/^get/i.test(methodName)) returnType = `: Promise<${entityName}>`;

      apiFunctions.push(
        `export const ${methodName} = async (${args.join(', ')}) ${returnType} => await axiosRequest.${httpMethod}(\`${fullPath}\`${reqArgs.length ? ', ' + reqArgs.join(', ') : ''});\n
        
        `,
      );
    });
  }

  fs.writeFileSync(path.join(outputDir, `${moduleName}.api.ts`), apiFunctions.join('\n'));
}

generateAll();
