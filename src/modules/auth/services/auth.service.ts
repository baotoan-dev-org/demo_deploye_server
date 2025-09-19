import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Equal, Not, Repository } from 'typeorm';
import { LoginDto } from '../dtos/login.dto';
import { ForgotPasswordDto } from '../dtos/forgot-password.dto';
import { ResetPasswordDto } from '../dtos/reset-password.dto';
import { LogoutDto } from '../dtos/logout.dto';
import { RefreshTokenDto } from '../dtos/refresh-token.dto';
import { FCMService } from 'src/common/services/fcm.service';
import { UserStatus, UserType } from '../../user/user.enum';
import { SubscribeUnsubscribeTopicDto } from '../dtos/subscribe-unsubscribe-topic.dto';
import { RefreshToken } from '../entities/refresh-token.entity';
import { AuthHandle } from '../auth.handle';
import { User } from '../../user/entities/user.entity';
import { JwtService } from 'src/common/services/jwt.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/common/services/mail.service';
import { BcryptService } from 'src/common/services/bcrypt.service';
import { GenerateTokenVerifyEmailDto } from '../dtos/generate-token-verify-email.dto';
import {
  ForgotPasswordType,
  LogoutType,
  RefreshTokenStatus,
  ResetPasswordType,
} from '../auth.enum';
import { VerifyOtpDto } from '../dtos/verify-otp.dto';
import { Otp } from '../entities/otp.entity';
import { TimeService } from 'src/common/services/time.service';
import * as dayjs from 'dayjs';
import { MINUTES_EXPIRE_OTP } from '../auth.constant';
import { UserService } from '@/modules/user/services/user.service';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { SystemService } from '@/modules/system/services/system.service';

@Injectable()
export class AuthService {
  constructor(
    private bcryptService: BcryptService,

    private authHandle: AuthHandle,

    private fcmService: FCMService,

    private dataSource: DataSource,

    private userService: UserService,

    private jwtService: JwtService,

    private timeService: TimeService,

    private mailService: MailService,

    private configService: ConfigService,

    private systemService: SystemService,

    @InjectRepository(Otp)
    private otpRepo: Repository<Otp>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  async generateTokenVerifyEmail(generateTokenVerifyEmailDto: GenerateTokenVerifyEmailDto) {
    const { email, password } = generateTokenVerifyEmailDto;

    const user = await this.userRepo.findOne({
      where: { email },
      select: ['id', 'name', 'password'],
    });

    if (!user) throw new NotFoundException('Tài khoản không tồn tại!');

    const isMatch = await this.bcryptService.compareHash(password, user.password);

    if (!isMatch) throw new UnauthorizedException('Mật khẩu không chính xác!');

    const token = this.jwtService.generateToken({
      payload: { id: user.id },
      secret: this.configService.get('EMAIL_SECRET'),
      timeExpire: '5m',
    });

    this.mailService.send({
      recipient: email,
      subject: 'Verify email!',
      content: this.mailService.getContentVerifyMail({
        recipientName: user.name,
        token,
      }),
    });

    return true;
  }

  // async verifyEmail(verifyEmailDto: TokenDto) {
  //   const { token } = verifyEmailDto;

  //   const payload = await this.jwtService.verifyToken({
  //     token,
  //     secret: this.configService.get('EMAIL_SECRET'),
  //   });

  //   const user = await this.userRepo.findOne({
  //     where: { id: payload.id },
  //   });

  //   if (!user) throw new NotFoundException('Tài khoản không tồn tại!');

  //   user.status = UserStatus.ACTIVE;

  //   const { accessToken, refreshToken } = this.authHandle.generateAccessRefreshToken(user);

  //   const [sidebarCountObj] = await Promise.all([
  //     user.type !== UserType.ROOT && this.systemService.getSidebarCountObj(user),
  //     this.userRepo.update(user.id, { status: UserStatus.ACTIVE }),
  //     this.refreshTokenRepo.insert({ userId: user.id, refreshToken }),
  //   ]);

  //   delete user.password;

  //   return { user, accessToken, refreshToken, sidebarCountObj: sidebarCountObj || {} };
  // }

  async login(loginDto: LoginDto) {
    const { emailOrPhone, password } = loginDto;

    let user = await this.userRepo.findOne({
      where: [
        { email: emailOrPhone, type: Not(Equal(UserType.CANDIDATE)) },
        { phone: emailOrPhone, type: Not(Equal(UserType.CANDIDATE)) },
      ],
      select: { id: true, password: true, type: true },
    });

    if (!user) throw new NotFoundException('Tài khoản không tồn tại!');

    const isMatch = await this.bcryptService.compareHash(password, user.password);

    if (!isMatch) throw new UnauthorizedException('Mật khẩu không chính xác!');

    if (user.type === UserType.ROOT) user = await this.userService.getUserByRoot(user.id);
    else user = await this.userService.getUser(user.id);

    // Nằm sau để check password trước
    if (user.status === UserStatus.INACTIVE) throw new ForbiddenException('Tài khoản đã bị khóa!');

    if (!user.userOrgUnitPositions.length)
      throw new ForbiddenException(
        'Tài khoản của bạn chưa được phân bổ vào đơn vị. Vui lòng yêu cầu quản lý phân bổ cho bạn!',
      );

    const { accessToken, refreshToken } = this.authHandle.generateAccessRefreshToken(user);

    const [sidebarCountObj] = await Promise.all([
      user.type !== UserType.ROOT && this.systemService.getSidebarCountObj(user),
      this.refreshTokenRepo.insert({ userId: user.id, refreshToken }),
    ]);

    delete user.password;

    return { user, accessToken, refreshToken, sidebarCountObj: sidebarCountObj || {} };
  }

  async logout(logoutDto: LogoutDto, user: UserRequest) {
    const { type, refreshToken } = logoutDto;

    if (type === LogoutType.THIS_DEVICE && !refreshToken)
      throw new BadRequestException('Refresh token is required!');

    return await this.refreshTokenRepo.delete({
      ...(type === LogoutType.THIS_DEVICE ? { refreshToken } : {}),
      userId: user.id,
    });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { phone, email, type } = forgotPasswordDto;

    if (type === ForgotPasswordType.EMAIL && !email)
      throw new BadRequestException('Vui lòng cung cấp email!');
    if (type === ForgotPasswordType.PHONE && !phone)
      throw new BadRequestException('Vui lòng cung cấp số điện thoại!');

    const user = await this.userRepo.findOne({
      where: [{ phone }, { email }],
      select: { id: true, status: true, name: true },
    });

    if (!user) throw new NotFoundException('Tài khoản không tồn tại!');
    if (user.status === UserStatus.INACTIVE)
      throw new ForbiddenException('Tài khoản chưa được kích hoạt!');

    return await this.dataSource
      .transaction(async (manager) => {
        // Send token to email
        if (type === ForgotPasswordType.EMAIL) {
          const token = this.jwtService.generateToken({
            payload: { id: user.id },
            secret: this.configService.get('EMAIL_SECRET'),
            timeExpire: '5m',
          });

          this.mailService.send({
            recipient: email,
            subject: 'Verify email to reset password!',
            content: this.mailService.getContentForgotPassword({
              recipientName: user.name,
              token,
            }),
          });
        } else {
          // const otp = this.randomService.otp();
          const otp = '1111';

          try {
            // Send otp cho service ngoài để nó gửi đi
          } catch (error) {
            throw new BadRequestException('Quá trình gửi OTP bị lỗi mong quý khách thử lại!');
          }

          await manager.delete(Otp, { phone });
          await manager.insert(Otp, {
            phone,
            otp,
            expiredAt: this.timeService.getExpirationTime(MINUTES_EXPIRE_OTP),
          });
        }
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { phone, otp } = verifyOtpDto;

    const [user, otpDb] = await Promise.all([
      this.userRepo.findOne({
        where: { phone },
        select: { id: true, status: true, name: true },
      }),
      this.otpRepo.findOne({ where: { phone, otp }, select: { id: true, expiredAt: true } }),
    ]);

    if (!user) throw new NotFoundException('Tài khoản không tồn tại!');
    if (user.status === UserStatus.INACTIVE)
      throw new ForbiddenException('Bạn chưa thực hiện xác thực!');

    if (!otpDb) throw new NotFoundException('Mã OTP không tồn tại');
    if (MINUTES_EXPIRE_OTP < dayjs(otpDb.expiredAt).diff(dayjs(), 'minute'))
      throw new BadRequestException('Mã xác thực đã hết hạn, vui lòng yêu cầu mã mới!');

    await this.otpRepo.delete(otpDb.id);

    return {
      token: this.jwtService.generateToken({
        payload: { id: user.id },
        secret: this.configService.get('OTP_SECRET'),
        timeExpire: '5m',
      }),
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password, type } = resetPasswordDto;

    const payload = await this.jwtService.verifyToken({
      token,
      secret:
        type === ResetPasswordType.EMAIL
          ? this.configService.get('EMAIL_SECRET')
          : this.configService.get('OTP_SECRET'),
    });

    const [user, newPassword] = await Promise.all([
      this.userService.getUser(payload.id),
      this.bcryptService.hash(password),
    ]);

    if (user.status === UserStatus.INACTIVE) throw new ForbiddenException('Tài khoản đã bị khóa!');

    if (!user.userOrgUnitPositions.length)
      throw new ForbiddenException(
        'Tài khoản của bạn chưa được phân bổ vào đơn vị. Nên không thể thực hiện chức năng này!',
      );

    const { accessToken, refreshToken } = this.authHandle.generateAccessRefreshToken(user);

    const [sidebarCountObj] = await Promise.all([
      user.type !== UserType.ROOT && this.systemService.getSidebarCountObj(user),
      this.refreshTokenRepo.insert({ userId: user.id, refreshToken }),
      this.userRepo.update(user.id, { password: newPassword }),
    ]);

    return { user, accessToken, refreshToken, sidebarCountObj: sidebarCountObj || {} };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refreshToken } = refreshTokenDto;

    const payload = await this.jwtService.verifyToken({
      token: refreshToken,
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });

    const [refreshTokenRow, user] = await Promise.all([
      this.refreshTokenRepo.findOne({
        where: { refreshToken, userId: payload.id },
        select: ['refreshToken', 'status', 'id'],
      }),
      this.userRepo.findOne({ where: { id: payload.id } }),
    ]);

    if (!refreshTokenRow) throw new ForbiddenException('Bạn chưa thực hiện xác thực!');

    if (refreshTokenRow.status === RefreshTokenStatus.USED) {
      await this.refreshTokenRepo.update(
        { userId: payload.id, status: RefreshTokenStatus.UNUSED },
        { status: RefreshTokenStatus.USED },
      );
      throw new BadRequestException('Refresh token đã được sử dụng!');
    }

    const tokens = this.authHandle.generateAccessRefreshToken(user);

    await Promise.all([
      this.refreshTokenRepo.update(refreshTokenRow.id, {
        status: RefreshTokenStatus.USED,
      }),
      this.refreshTokenRepo.insert({
        refreshToken: tokens.refreshToken,
        userId: user.id,
      }),
    ]);

    return tokens;
  }

  async subscribeUnsubscribeTopic(
    subscribeUnsubscribeTopicDto: SubscribeUnsubscribeTopicDto,
    isSubscribe: boolean,
    user: UserRequest,
  ) {
    const { id, type } = user;
    const { fcmToken } = subscribeUnsubscribeTopicDto;

    const topic = type === UserType.ROOT ? type + '-' + id : id;

    await (isSubscribe
      ? this.fcmService.subscribeTopicByToken(fcmToken, topic)
      : this.fcmService.unsubscribeTopicByToken(fcmToken, topic));

    return { fcmToken };
  }
}
