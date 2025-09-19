export const FILE_IMAGE_TYPE_WHITELIST = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];

export const FILE_DOCUMENT_TYPE_WHITELIST = [
  'doc',
  'docx',
  'xls',
  'xlsx',
  'pdf',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'rtf',
];

export const FILE_TYPE_WHITELIST = [...FILE_IMAGE_TYPE_WHITELIST, ...FILE_DOCUMENT_TYPE_WHITELIST];

// Nén
export const FILE_COMPRESSION_TYPE_WHITELIST = ['zip', 'rar', '7z', 'tar', 'gz'];

// Media
export const FILE_MEDIA_TYPE_WHITELIST = ['mp3', 'wav', 'mp4', 'avi', 'mov', 'mkv', 'webm'];

// Kỹ thuật (nếu bạn dùng CAD)
export const FILE_TECHNICAL_TYPE_WHITELIST = ['dwg', 'dxf', 'step', 'stp'];

// Khác
export const FILE_OTHER_TYPE_WHITELIST = ['json', 'xml'];
