import { ApplicationStatus } from '../application/application.enum';
import { FaqStatus } from '../faq/faq.enum';

export const faqsInsert = [
  {
    question:
      'Bạn có thể tìm hiểu tất cả thông tin về công ty THNHH MTV Sen Vàng Việt Nam tại đâu?',
    answer: `<p>Bạn có thể tìm hiểu tất cả thông tin về công ty THNHH MTV Sen Vàng Việt Nam tại link sau : <a href="(chèn link giới thiệu về chúng tôi tại website)" target="_blank" rel="noopener noreferrer">Xem tại đây</a></p>`,
    note: null,
    order: 1,
    status: FaqStatus.ACTIVE,
  },
  {
    question: 'Các chế độ phúc lợi tại công ty Sen Vàng Việt Nam là gì?',
    answer: `
      <p>Khi bạn gia nhập đại gia đình Sen Vàng, bạn không những có cơ hội làm việc tại môi trường chuyên nghiệp, ổn định mà còn có rất nhiều phúc lợi nhé:</p>
      <ol>
        <li>Tham gia đầy đủ Bảo hiểm xã hội, Bảo hiểm y tế, Bảo hiểm thất nghiệp.</li>
        <li>Lương tháng 13 và thưởng thâm niên.</li>
        <li>Thưởng chuyên cần từ 800.000 VNĐ/ tháng.</li>
        <li>Chế độ nghỉ phép năm, nghỉ Lễ Tết theo quy định.</li>
        <li>Khám sức khỏe định kỳ, nghỉ mát hàng năm, quà tặng sinh nhật, cưới…</li>
        <li>Hỗ trợ cơm trưa.</li>
        <li>Các chương trình đào tạo nội bộ và bên ngoài để nâng cao năng lực làm việc.</li>
      </ol>`,
    note: null,
    order: 2,
    status: FaqStatus.ACTIVE,
  },
  {
    question: 'Tôi ứng tuyển vào công ty có mất chi phí gì không?',
    answer: `<p>Tất cả các vị trí tuyển dụng tại Công ty TNHH MTV Sen Vàng Việt Nam <strong>ĐỀU HOÀN TOÀN MIỄN PHÍ</strong></p>`,
    note: null,
    order: 3,
    status: FaqStatus.ACTIVE,
  },
  {
    question:
      'Môi trường làm việc của công ty Sen Vàng như thế nào và tìm kiếm thông tin tuyển dụng ở đâu?',
    answer: `
      <p>Chúng tôi xây dựng một môi trường làm việc <strong>Chuyên nghiệp – Minh bạch – Tôn trọng – Thân thiện</strong>, nơi mỗi thành viên được đánh giá công bằng, khuyến khích sáng tạo và có cơ hội phát triển sự nghiệp lâu dài dựa trên các giá trị cốt lõi: <em>CHÍNH TRỰC – TRÁCH NHIỆM – SÁNG TẠO - TÔN TRỌNG – CHIA SẺ - CHỈNH CHU</em>.</p>
      <p>Ngoài các thông tin tuyển dụng tại website, các bạn có thể tìm kiếm chúng tôi tại các trang thông tin sau:</p>
      <ul>
        <li>Fanpage: <a href="Link" target="_blank" rel="noopener noreferrer">Link</a></li>
        <li>Linkedin: <a href="Link" target="_blank" rel="noopener noreferrer">Link</a></li>
        <li>Instagram: <a href="Link" target="_blank" rel="noopener noreferrer">Link</a></li>
        <li>Tiktok: <a href="Link" target="_blank" rel="noopener noreferrer">Link</a></li>
      </ul>
      <p>Và các bạn hãy Like, Share và bấm Đăng ký để luôn luôn nhận được thông tin tuyển dụng hấp dẫn từ chúng tôi nhé.</p>`,
    note: null,
    order: 4,
    status: FaqStatus.ACTIVE,
  },
  {
    question:
      'Tôi không có kinh nghiệm thì có ứng tuyển được không và quy trình tuyển dụng như thế nào? Tôi cần chuẩn bị hồ sơ ra sao?',
    answer: `
      <p>Tại Sen Vàng, các nhân sự đều được đào tạo bài bản về kiến thức và chuyên môn để từng bước các bạn nắm vững công việc và phát triển sự nghiệp ngay cả khi bạn chưa có kinh nghiệm.</p>
      <p>Sen Vàng có quy trình tuyển dụng công khai, minh bạch và chuyên nghiệp. Tùy theo vị trí ứng tuyển, bạn sẽ trải qua từ 01 - 03 vòng phỏng vấn và bạn sẽ nhận được kết quả phỏng vấn từ 03 - 05 ngày làm việc qua email, tin nhắn, cuộc gọi từ bộ phận tuyển dụng.</p>
      <p>Chúc mừng bạn đã gia nhập Gia đình Sen Vàng, bạn sẽ nhận được email hướng dẫn hồ sơ thủ tục nhận việc từ bộ phận tuyển dụng nhé. Hãy chuẩn bị hồ sơ đầy đủ và bắt đầu hành trình cùng Sen Vàng Việt Nam.</p>`,
    note: null,
    order: 5,
    status: FaqStatus.ACTIVE,
  },
];

export const emailTemplates = [
  {
    status: ApplicationStatus.SAVED_CV,
    subject: 'Hồ sơ của bạn đã được lưu tại Sen Vàng Việt Nam',
    content:
      '<p>Chào bạn [Tên ứng viên],</p><p>&nbsp;</p><p>Cảm ơn bạn đã dành thời gian tìm hiểu và ứng tuyển vào vị trí [Tên vị trí] tại Sen Vàng Việt Nam.</p><p>Do có một số thay đổi trong kế hoạch tuyển dụng chúng tôi chưa thể tiến hành bước tiếp theo trong quy trình với bạn vào thời điểm này.&nbsp;</p><p>Chúng tôi vẫn đánh giá cao năng lực và tiềm năng mà bạn thể hiện qua hồ sơ và các buổi phỏng vấn tại công ty.&nbsp;</p><p>Sen Vàng sẽ lưu giữ thông tin và ưu tiên liên hệ&nbsp; với bạn ngay khi vị trí này được tuyển dụng trở lại.</p><p>Một lần nữa, cảm ơn bạn vì đã tin tưởng Sen Vàng là nơi bạn mong muốn gắn bó và phát triển sự nghiệp.&nbsp;</p><p>&nbsp;</p><p>Chúc bạn thật nhiều sức khỏe, thành công và giữ vững tinh thần tích cực trên hành trình phía trước!</p><p>&nbsp;</p><p><i>Thanks &amp; Best Regard,</i></p><p><i>HR Department | Sen Vàng Việt Nam</i></p>',
  },
  {
    status: ApplicationStatus.OFFERED,
    subject: 'Thư mời nhận việc tại Sen Vàng Việt Nam',
    content:
      '<p><strong>Dear anh/chị [Tên],</strong></p><p>&nbsp;</p><p>Trước tiên, chúng tôi xin gửi lời chúc mừng anh/chị đã trúng tuyển vào vị trí <strong>[Tên vị trí]</strong> tại Công ty TNHH MTV Sen Vàng Việt Nam.</p><p>Như đã trao đổi, xin gửi đến anh/chị thông tin chi tiết về công việc và mức lương đã thỏa thuận như sau:</p><ol><li><strong>Chức danh:</strong> [Tên vị trí]</li><li><strong>Nơi làm việc:</strong> 200 Nguyễn Văn Bá, Phường Trường Thọ, Thành phố Thủ Đức, TP. HCM</li><li><strong>Thời gian nhận việc:</strong> 7h45, ngày 05/06/2025</li><li><strong>Lương và các chế độ khác:</strong> Vui lòng xem chi tiết trong file “Thư mời nhận việc” đính kèm.</li><li><strong>Lưu ý:</strong> Anh/chị vui lòng phản hồi xác nhận nhận việc qua email này trong thời gian sớm nhất để Phòng Nhân sự có thể chuẩn bị chu đáo.</li></ol><p><strong>Vào ngày đầu tiên làm việc (07h45, 05/06/2025), anh/chị vui lòng mang theo các giấy tờ sau để nộp tại Phòng Nhân sự:</strong></p><ol><li>Đơn xin việc</li><li>Sơ yếu lý lịch (có dán ảnh, công chứng không quá 6 tháng)</li><li>Giấy khám sức khỏe do cơ quan y tế cấp quận/huyện trở lên (có giá trị trong 6 tháng)</li><li>CCCD (bản sao công chứng)</li><li>Giấy xác nhận cư trú (CT07 hoặc CT08)</li><li>Bằng tốt nghiệp Cao đẳng/Đại học và các chứng chỉ liên quan (bản sao công chứng)</li><li>Thông tin về mã số thuế thu nhập cá nhân và người phụ thuộc (nếu có)</li><li>Tài khoản ngân hàng Sacombank (nếu có)</li><li>Lý lịch tư pháp (áp dụng cho vị trí Bảo vệ, Tài xế)</li></ol><p><i>Lưu ý: Tất cả các giấy tờ bản sao cần được công chứng, chứng thực bởi địa phương và không quá 6 tháng.</i></p><p>&nbsp;</p><p>Nếu anh/chị có bất kỳ thắc mắc hay cần hỗ trợ thêm, vui lòng liên hệ lại qua email này.</p><p>Một lần nữa, rất vui mừng được chào đón anh/chị gia nhập đại gia đình Sen Vàng Việt Nam!</p><p>&nbsp;</p><p><i>Thanks &amp; Best Regard,</i></p><p><i>HR Department | Sen Vàng Việt Nam</i></p>',
  },
  {
    status: ApplicationStatus.THANK_LETTER,
    subject: 'Thư cảm ơn từ Sen Vàng Việt Nam',
    content:
      '<p>Dear [Tên ứng viên]<br><br>Có thể nói ngay từ đầu công ty cũng rất ấn tượng với hồ sơ của bạn và tất cả những điều mà bạn đã thể hiện trong buổi phỏng vấn.&nbsp;<br><br>Tuy nhiên, một số ứng viên đã được chúng tôi quyết định chọn lựa trên cơ sở đánh giá rất kỹ lưỡng từ nhiều yếu tố và thấu đáo. Một lần nữa xin cám ơn những ý kiến, chia sẻ của bạn đối với Công ty TNHH MTV Sen Vàng Việt Nam. Và Công ty sẽ giữ lại hồ sơ của bạn và hy vọng hợp tác với bạn cho các vị trí khác trong tương lai.<br><br>Chúng tôi xin gửi lời chúc tốt đẹp nhất đến bạn trong các bước tiếp theo của sự nghiệp của mình.&nbsp;<br><br><i>Thanks &amp; Best Regard,</i></p><p><i>HR Department | Sen Vàng Việt Nam</i></p>',
  },
  {
    status: ApplicationStatus.INTERVIEW,
    subject: 'Thư mời phỏng vấn vị trí [Tên Vị Trí] tại Sen Vàng Việt Nam',
    content:
      '<p style="text-align:justify;"><span style="color:#222222;">Dear [Tên ứng viên]<strong>,</strong></span></p><p style="text-align:justify;">&nbsp;</p><p style="text-align:justify;"><span style="color:#222222;">Lời đầu tiên, Công ty TNHH MTV Sen Vàng Việt Nam xin cảm ơn Bạn vì đã quan tâm đến vị trí tuyển dụng của công ty chúng tôi. Sau khi xem xét kỹ lưỡng, chúng tôi nhận thấy Bạn là một trong những người phù hợp với tiêu chí của vị trí&nbsp;<strong>[Tên vị trí]&nbsp;</strong>mà chúng tôi đang tuyển.</span></p><p style="text-align:justify;"><span style="color:#222222;">Vì thế, để có thể trao đổi kỹ hơn về chi tiết công việc, cũng như tìm hiểu sâu hơn về kỹ năng chuyên môn của Bạn. Chúng tôi trân trọng kính&nbsp;mời&nbsp;Bạn đến tham gia buổi&nbsp;phỏng&nbsp;vấn&nbsp;tại:</span></p><p style="text-align:justify;"><span style="color:#222222;">Địa chỉ:&nbsp;<strong>Số 200 Nguyễn Văn Bá, P. Trường Thọ, TP. Thủ Đức, TP. HCM</strong></span></p><p style="text-align:justify;"><span style="color:#222222;">Định vị:<i>&nbsp;</i></span><a href="https://maps.app.goo.gl/aPsi4b4PkoMw9SzVA"><span style="color:#1155CC;"><i>https://maps.app.goo.gl/aPsi4b4PkoMw9SzVA</i></span></a></p><p style="text-align:justify;"><span style="color:#222222;">Thời gian:<strong>&nbsp;10:00 Thứ Năm, ngày 05/06/2025</strong></span></p><p style="text-align:justify;"><span style="color:#222222;"><strong>Để buổi&nbsp;phỏng&nbsp;vấn&nbsp;diễn ra thuận lợi.&nbsp;Bạn vui lòng hoàn thành&nbsp;</strong></span><span style="color:red;"><strong>Mẫu Thông tin ứng viên</strong></span><span style="color:#222222;"><strong>&nbsp;</strong></span><span style="color:red;"><i><strong>(File đính kèm)&nbsp;</strong></i></span><span style="color:#222222;"><strong>và&nbsp;phản hồi lại email này kèm Mẫu Thông tin ứng viên sớm nhất ngay khi nhận được.&nbsp;</strong></span></p><p style="text-align:justify;"><span style="color:#222222;"><strong>Ghi chú: Khi Cổng gặp Bảo vệ, Bạn vui lòng báo&nbsp;vị trí&nbsp;Phỏng&nbsp;vấn&nbsp;và làm theo hướng dẫn nhé.</strong></span></p><p style="text-align:justify;">&nbsp;</p><p style="text-align:justify;"><span style="color:#222222;">Chúc Bạn may mắn trong buổi&nbsp;phỏng&nbsp;vấn&nbsp;sắp tới.</span></p><p style="text-align:justify;">&nbsp;</p><p><span style="color:red;"><strong>Tìm hiểu thêm về công ty:</strong></span></p><p><span style="color:red;"><strong>Website:&nbsp;</strong></span><a href="https://sevago.jewelry/"><span style="color:blue;">https://sevago.jewelry/</span></a></p><p style="text-align:justify;"><span style="color:red;"><strong>Facebook:&nbsp;</strong></span><a href="https://www.facebook.com/TuyendungSenvangVietnam/"><span style="color:blue;">https://www.facebook.com/TuyendungSenvangVietnam/</span></a></p><p style="text-align:justify;"><span style="color:red;"><strong>Tiktok:&nbsp;</strong></span><a href="https://www.tiktok.com/@tuyendungsenvangvietnam"><span style="color:blue;">https://www.tiktok.com/@tuyendungsenvangvietnam</span></a><span style="color:blue;"><u>/</u></span></p><p style="text-align:justify;"><span style="color:red;"><strong>Linkedin:&nbsp;</strong></span><a href="https://www.linkedin.com/company/tuy%E1%BB%83n-d%E1%BB%A5ng-sen-v%C3%A0ng-vi%E1%BB%87t-nam-trang-suc"><span style="color:blue;">https://www.linkedin.com/company/tuyển-dụng-sen-vàng-việt-nam-trang-suc</span></a><span style="color:blue;"><u>/</u></span></p><p style="text-align:justify;">&nbsp;</p><p><i>Thanks &amp; Best Regard,</i></p><p><i>HR Department | Sen Vàng Việt Nam</i></p>',
  },
  {
    status: ApplicationStatus.NOT_QUALIFIED,
    subject: 'Thông báo về kết quả ứng tuyển tại Sen Vàng Việt Nam',
    content:
      '<p>Chào bạn [Tên ứng viên],</p><p>&nbsp;</p><p>Cảm ơn bạn đã dành thời gian tìm hiểu và ứng tuyển vào vị trí [Tên vị trí] tại Sen Vàng Việt Nam.</p><p>&nbsp;</p><p>Sau quá trình xem xét kỹ lưỡng, chúng tôi rất tiếc khi phải thông báo rằng hồ sơ của bạn chưa phù hợp với các tiêu chí tuyển dụng của vị trí này.</p><p>Dù vậy, chúng tôi rất ấn tượng với những gì bạn đã chia sẻ và sẽ lưu giữ hồ sơ để cân nhắc trong những đợt tuyển dụng sắp tới khi có vị trí phù hợp hơn.</p><p>Cảm ơn bạn đã tin tưởng và lựa chọn Sen Vàng là nơi phát triển sự nghiệp.&nbsp;</p><p>&nbsp;</p><p>Chúc bạn luôn giữ vững tinh thần tích cực và sớm tìm thấy cơ hội phù hợp!</p><p>&nbsp;</p><p><i>Thanks &amp; Best Regard,</i></p><p><i>HR Department | Sen Vàng Việt Nam</i></p>',
  },
  {
    status: ApplicationStatus.PENDING,
    subject: 'Xác nhận đã ứng tuyển tại Sen Vàng Việt Nam thành công',
    content:
      '<p>Chào mừng bạn đến với Sen Vàng Việt Nam,<br><br>Trước tiên, chúng tôi xin gửi lời cảm ơn chân thành đến bạn vì đã quan tâm đến cơ hội nghề nghiệp tại Sen Vàng và dành thời gian ứng tuyển vào vị trí [Tên vị trí].<br><br>Chúng tôi rất trân trọng sự chuẩn bị kỹ lưỡng của bạn cũng như sự chủ động trong việc tìm hiểu về công ty và vị trí ứng tuyển. Hiện tại, chúng tôi đang tiến hành xem xét hồ sơ một cách cẩn trọng để đưa ra đánh giá phù hợp nhất.<br><br>Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất ngay khi hồ sơ của bạn phù hợp với yêu cầu tuyển dụng.<br><br>Một lần nữa, cảm ơn bạn đã đồng hành cùng Sen Vàng Việt Nam.<br>Chúc bạn một ngày thật tích cực và nhiều năng lượng!<br><br><i>Thanks &amp; Best Regard,</i></p><p><i>HR Department | Sen Vàng Việt Nam</i></p>',
  },
];
