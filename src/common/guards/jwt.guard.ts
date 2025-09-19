import { User } from '@/modules/user/entities/user.entity';
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from 'src/common/services/jwt.service';
import { Repository } from 'typeorm';
import { JWT_WHITE_LIST_MODULES } from '../consts/jwt.const';
import { CacheService } from '../services/cache.service';

const CACHE_TTL = {
  USER: 3600, // 1 hour
  POSITION: 1800, // 30 minutes
} as const;

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly jwtService: JwtService,

    private readonly configService: ConfigService,

    private readonly cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userUnitPositionId = req.headers['userunitpositionid'];

    const token = this.jwtService.getTokenFromRequest(req);

    const payload = await this.jwtService.verifyToken({
      token,
      secret: this.configService.get('JWT_ACCESS_SECRET'),
    });

    const USER_CACHE_KEY = `user:${payload.id}`;
    const POSITION_CACHE_KEY = `position:${payload.id}_${userUnitPositionId}`;

    // White list check
    const isWhitelistedPath = JWT_WHITE_LIST_MODULES.includes(req.path);

    const [cachedUser, cachedPosition] = await Promise.all([
      this.cacheService.get<User>(USER_CACHE_KEY),
      isWhitelistedPath
        ? null
        : this.cacheService.get<{ positionId: string; orgUnitId: string }>(POSITION_CACHE_KEY),
    ]);

    // Get user data from cache or database
    let user: User;
    if (cachedUser) user = cachedUser;
    else {
      user = await this.userRepo.findOne({
        where: { id: payload.id },
        select: ['id', 'name', 'email', 'type', 'status'],
      });

      if (!user) throw new ForbiddenException('Người dùng không tồn tại');

      this.cacheService.set(USER_CACHE_KEY, user, CACHE_TTL.USER);
    }

    if (isWhitelistedPath) {
      req.user = user;
      return true;
    }

    if (!userUnitPositionId)
      throw new ForbiddenException(
        'Bạn chưa thuộc một đơn vị cụ thể, vui lòng yêu cầu bộ phận quản trị phân bổ vị trí cho bạn!',
      );

    // Get position data from cache or database
    let positionId: string, orgUnitId: string;

    if (cachedPosition) {
      ({ positionId, orgUnitId } = cachedPosition);
    } else {
      await this.cacheService.delByPattern(`position:${payload.id}_*`);
      const freshPosition =
        await this.jwtService.getPositionAndOrgFromUserUnitPositionId(userUnitPositionId);

      if (!freshPosition.positionId || !freshPosition.orgUnitId)
        throw new ForbiddenException(
          'Vị trí hoặc đơn vị tổ chức không hợp lệ, vui lòng yêu cầu bộ phận quản trị kiểm tra lại!',
        );

      this.cacheService.set(
        POSITION_CACHE_KEY,
        { positionId: freshPosition.positionId, orgUnitId: freshPosition.orgUnitId },
        CACHE_TTL.POSITION,
      );
    }

    req.user = {
      ...user,
      positionId,
      orgUnitId,
    };

    return true;
  }
}
