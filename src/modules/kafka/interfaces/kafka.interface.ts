export interface BaseKafkaMessage<T = any> {
  id?: string;
  timestamp?: string;
  key?: string;
  value?: {
    type: string;
    data: T;
  };
}

export interface UserListMessage {
  users: any[];
  timestamp: string;
  totalCount: number;
}
