import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDateOnly, parseDateOnly } from '@/lib/domain/date-only';

type DatePickerProps = {
  'aria-invalid'?: boolean;
  id?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value?: string;
};

export function DatePicker({
  'aria-invalid': ariaInvalid,
  id,
  onChange,
  placeholder = 'Selecciona una fecha',
  value,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const date = value ? parseDateOnly(value) : undefined;

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-invalid={ariaInvalid}
          className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
          data-empty={!date}
          id={id}
          type="button"
          variant="outline"
        >
          {date ? format(date, 'PPP', { locale: es }) : <span>{placeholder}</span>}
          <ChevronDownIcon aria-hidden className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          className="p-4 [--cell-size:2.75rem]"
          defaultMonth={date}
          locale={es}
          mode="single"
          onSelect={(selected) => {
            if (selected) {
              onChange(formatDateOnly(selected));
            }

            setIsOpen(false);
          }}
          selected={date}
        />
      </PopoverContent>
    </Popover>
  );
}
