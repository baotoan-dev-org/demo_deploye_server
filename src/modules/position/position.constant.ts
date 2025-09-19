// import { PositionTitleEnum } from './position.enum';

export const LEVEL = {
  CEO: 1,
  DeputyCEO: 2,
  AssistantCEO: 3,
  DivisionHead: 4,
  DepartmentHead: 5,
  DeputyDept: 6,
  TeamLead: 7,
  Staff: 8,
};

// export const DEPUTIES = [PositionTitleEnum.DeputyCEO, PositionTitleEnum.AssistantCEO];

// // Lấy mảng thứ tự các chức danh
// export const positionOrder = [
//   PositionTitleEnum.CEO,
//   PositionTitleEnum.DeputyCEO,
//   PositionTitleEnum.AssistantCEO,
//   PositionTitleEnum.DivisionHead,
//   PositionTitleEnum.DepartmentHead,
//   PositionTitleEnum.DeputyDept,
//   PositionTitleEnum.TeamLead,
//   PositionTitleEnum.Staff,
// ];

export const TYPE_TREE_POSITION = {
  division: 'division',
  department: 'department',
  team: 'team',
  teamChildren: 'team_children',
};
