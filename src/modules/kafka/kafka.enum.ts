export enum KafkaTopics {
  USER_LIST_RELATION_ANCESTOR_ORG_UNIT = 'sevago.office.user.list-relation-ancestor-org-unit',
  // user
  USER_ACTION = 'sevago.office.user.change',

  // org unit
  ORG_UNIT_ACTION = 'sevago.office.org-unit.change',

  // position
  POSITION_ACTION = 'sevago.office.position.change',
}

export enum KafkaActionType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete', // xóa vĩnh viễn
  REMOVE = 'remove', // xóa vào thùng rác
  RESTORE = 'restore', // khôi phục
}
