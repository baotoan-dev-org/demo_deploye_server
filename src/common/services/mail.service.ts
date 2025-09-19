import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { SentMessageInfo } from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: SentMessageInfo;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('EMAIL_SENDER'),
        pass: this.configService.get('EMAIL_PASSWORD'),
      },
    });
  }

  isSend(content: string): boolean {
    return true; // mở send mail cho môi trường dev và prod
    // const serverBuild = this.configService.get('SERVER_BUILD');
    // if (serverBuild === 'production') return true;
    // Logger.log('Send mail skipped (develop environment).');
    // Logger.log(content);
    // return false;
  }

  send(params: { recipient: string; subject: string; content: string }) {
    const { recipient, subject, content } = params;

    if (!this.isSend(content)) return;

    this.transporter.sendMail(
      {
        from: this.configService.get('EMAIL_SENDER'),
        to: recipient,
        subject: subject,
        text: content,
      },
      (error: any, info: any) => {
        if (error) Logger.log(error);
        else Logger.log('Email sent: ' + info.response);
      },
    );
  }

  sendHtml(params: {
    recipient: string;
    subject: string;
    content: string;
    attachments?: { filename: string; path: string }[];
    cc?: string[];
    bcc?: string[];
  }) {
    const { recipient, subject, content, attachments, cc, bcc } = params;

    if (!this.isSend(content)) return;

    this.transporter.sendMail(
      {
        from: this.configService.get('EMAIL_SENDER'),
        to: recipient,
        cc: cc,
        bcc: bcc,
        subject: subject,
        html: content,
        attachments: attachments || [],
      },
      (error: any, info: any) => {
        if (error) Logger.log(error);
        else Logger.log('Email sent: ' + info.response);
      },
    );
  }

  getContentVerifyMail(params: { recipientName: string; token: string }) {
    const { recipientName, token } = params;

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>Dear <strong>${recipientName}</strong>,</p>

      <p>
        SEVAGO would like to send you the code to verify your <strong>email address</strong>. 
        Please use the following code to complete your account registration:
      </p>

      <p style="font-size: 18px; font-weight: bold; color: #2E86C1;">Code: ${token}</p>

      <p>This verification code is valid for <strong>10 minutes</strong>.</p>

      <p>Thank you!<br/>SEVAGO Team</p>
    </div>
  `;
  }

  getContentForgotPassword(params: { recipientName: string; token: string }) {
    const { recipientName, token } = params;

    return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>Dear <strong>${recipientName}</strong>,</p>

      <p>
        SEVAGO received a request to reset your password. Please use the following verification code:
      </p>

      <p style="font-size: 18px; font-weight: bold; color: #C0392B;">Code: ${token}</p>

      <p>This verification code is valid for <strong>10 minutes</strong>.</p>

      <p>If you did not request a password reset, please ignore this email.</p>

      <p>Thank you!<br/>SEVAGO Team</p>
    </div>
  `;
  }

  getContentApplicationSuccess(params: { recipientName: string; jobName: string }) {
    return `
        <p>Chào mừng bạn đến với Sen Vàng Việt Nam,&nbsp;</p>
        <p>
          Trước tiên, chúng tôi xin gửi lời cảm ơn chân thành đến bạn vì đã quan tâm đến cơ hội nghề
          nghiệp tại Sen Vàng và dành thời gian ứng tuyển vào vị trí ${params?.jobName}.&nbsp;
        </p>
        <p>
          Chúng tôi rất trân trọng sự chuẩn bị kỹ lưỡng của bạn cũng như sự chủ động trong việc tìm hiểu
          về công ty và vị trí ứng tuyển. Hiện tại, chúng tôi đang tiến hành xem xét hồ sơ một cách cẩn
          trọng để đưa ra đánh giá phù hợp nhất.&nbsp;
        </p>
        <p>
          Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất ngay khi hồ sơ của bạn phù hợp với yêu
          cầu tuyển dụng. Một lần nữa, cảm ơn bạn đã đồng hành cùng Sen Vàng Việt Nam. Chúc bạn một ngày
          thật tích cực và nhiều năng lượng!&nbsp;
        </p>
        <p><i>Thanks &amp; Best Regard,</i></p>
        <p><i>HR Department | Sen Vàng Việt Nam</i></p>
    `;
  }
}
