import * as React from 'react';

import { Select } from '@/components/ui/select';
import { billingPeriodLabels } from '@/lib/domain/billing-period';
import { billingPeriods } from '@/lib/local-db/monsterly-db';

const BillingPeriodSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>((props, ref) => (
  <Select ref={ref} {...props}>
    {billingPeriods.map((period) => (
      <option key={period} value={period}>
        {billingPeriodLabels[period]}
      </option>
    ))}
  </Select>
));
BillingPeriodSelect.displayName = 'BillingPeriodSelect';

export { BillingPeriodSelect };
