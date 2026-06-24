import { Badge } from '@/components/brand/Badge'
import { DeepoIcon } from '@/brand/icons'
import { formatShortDate } from './format'
import { ASSIGNEE_ACTOR, TASK_STATUS, type AssigneeActor, type TaskStatus } from './status'

export interface TaskRowProps {
  title: string
  assigneeActor: AssigneeActor
  status: TaskStatus
  dueAt?: string | null
  overdue?: boolean
}

/** One task: who it is assigned to (actor), its status, and when it is due. */
export function TaskRow({ title, assigneeActor, status, dueAt, overdue }: TaskRowProps) {
  const actor = ASSIGNEE_ACTOR[assigneeActor]
  const st = TASK_STATUS[status]
  return (
    <div className="dp-task-row">
      <span className="dp-task-row__title">{title}</span>
      <span className="dp-actor-chip" data-actor={assigneeActor}>
        <DeepoIcon id={actor.icon} />
        {actor.label}
      </span>
      <Badge variant={st.variant} dot data-task-status={status}>
        {st.label}
      </Badge>
      {dueAt ? (
        <span className={['dp-led-due', overdue ? 'dp-led-due--over' : ''].filter(Boolean).join(' ')}>
          {formatShortDate(dueAt)}
        </span>
      ) : null}
    </div>
  )
}
