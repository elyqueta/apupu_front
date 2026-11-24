/**
 * Chaves i18n do Bloco 11 (comunidades, equipas reutilizáveis, partilhas)
 * e das correções pedidas pelo autor durante o bloco (detalhe da tarefa).
 */

export const BLOCK11_KEYS_PT = {
  'block11.task.detailsTitle': 'Detalhes da tarefa',
  'block11.task.details': 'Ver detalhes',
  'block11.task.status': 'Estado',
  'block11.task.priority': 'Prioridade',
  'block11.task.due': 'Prazo',
  'block11.task.noDue': 'Sem prazo',
  'block11.task.event': 'Evento',
  'block11.task.team': 'Equipa',
  'block11.task.assignee': 'Responsável',
  'block11.task.noAssignee': 'Sem responsável',
  'block11.task.createdBy': 'Criada por',
  'block11.task.createdOn': 'Criada em',
  'block11.task.completedBy': 'Concluída por',
  'block11.task.completedOn': 'Concluída em',
  'block11.task.description': 'Descrição',
  'block11.task.noDescription': 'Sem descrição.',
  'block11.task.unknownAuthor': 'Autor desconhecido',
  'block11.task.authorLine': 'Criada por {name}',
  'block11.task.close': 'Fechar',
} as const;

export const BLOCK11_KEYS_EN: Record<keyof typeof BLOCK11_KEYS_PT, string> = {
  'block11.task.detailsTitle': 'Task details',
  'block11.task.details': 'View details',
  'block11.task.status': 'Status',
  'block11.task.priority': 'Priority',
  'block11.task.due': 'Due date',
  'block11.task.noDue': 'No due date',
  'block11.task.event': 'Event',
  'block11.task.team': 'Team',
  'block11.task.assignee': 'Assignee',
  'block11.task.noAssignee': 'No assignee',
  'block11.task.createdBy': 'Created by',
  'block11.task.createdOn': 'Created on',
  'block11.task.completedBy': 'Completed by',
  'block11.task.completedOn': 'Completed on',
  'block11.task.description': 'Description',
  'block11.task.noDescription': 'No description.',
  'block11.task.unknownAuthor': 'Unknown author',
  'block11.task.authorLine': 'Created by {name}',
  'block11.task.close': 'Close',
};
