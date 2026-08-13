import { useQuery } from '@tanstack/react-query'
import { listRolesFn } from '#/modules/roles/server/list-roles'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/shared/ui/select'

type RoleSelectProps = {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
}

export function RoleSelect({ value, onValueChange, disabled }: RoleSelectProps) {
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => listRolesFn(),
  })

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Pilih role" />
      </SelectTrigger>
      <SelectContent>
        {roles?.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            {role.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
