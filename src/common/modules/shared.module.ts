import { Global, Module, Provider } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from 'src/modules/auth/entities/refresh-token.entity';
import { BcryptService } from 'src/common/services/bcrypt.service';
import { FCMService } from 'src/common/services/fcm.service';
import { JwtService } from 'src/common/services/jwt.service';
import { MailService } from 'src/common/services/mail.service';
import { QueryService } from 'src/common/services/query.service';
import { RandomService } from 'src/common/services/random.service';
import { NumberService } from '../services/number.service';
import { ObjectService } from '../services/object.service';
import { StringService } from '../services/string.service';
import { TimeService } from '../services/time.service';
import { ValidationService } from '../services/validation.service';
import { ArrayService } from '../services/array.service';
import { UserOrgUnitPosition } from '@/modules/user/entities/user-unit-position.entity';
import { LocalFileService } from '../services/local-file.service';

const providers: Provider[] = [
  LocalFileService,
  FCMService,
  QueryService,
  BcryptService,
  RandomService,
  JwtService,
  MailService,
  NumberService,
  ObjectService,
  StringService,
  TimeService,
  ValidationService,
  ArrayService,
];

@Global()
@Module({
  providers,
  imports: [TypeOrmModule.forFeature([RefreshToken, UserOrgUnitPosition])],
  exports: providers,
})
export class SharedModule {}
