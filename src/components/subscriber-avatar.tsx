import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { avatarToneIndex, subscriberInitials } from '@/lib/domain/avatar';
import type { SubscriberNameParts } from '@/lib/domain/subscriber-identity';
import { cn } from '@/lib/utils';

// Literal class pairs so Tailwind's scanner sees them; fixed colors hold
// contrast on both themes. Order must match avatarToneCount.
const avatarTones = [
  'bg-[oklch(0.55_0.12_25)] text-[oklch(0.98_0.01_25)]',
  'bg-[oklch(0.58_0.11_70)] text-[oklch(0.99_0.02_70)]',
  'bg-[oklch(0.52_0.11_145)] text-[oklch(0.98_0.02_145)]',
  'bg-[oklch(0.54_0.1_190)] text-[oklch(0.98_0.01_190)]',
  'bg-[oklch(0.55_0.12_230)] text-[oklch(0.98_0.01_230)]',
  'bg-[oklch(0.53_0.13_280)] text-[oklch(0.98_0.01_280)]',
  'bg-[oklch(0.55_0.13_320)] text-[oklch(0.98_0.01_320)]',
  'bg-[oklch(0.56_0.13_350)] text-[oklch(0.98_0.01_350)]',
];

type SubscriberAvatarProps = SubscriberNameParts & {
  className?: string;
  id: string;
};

export function SubscriberAvatar({
  className,
  id,
  maternal_last_name,
  name,
  paternal_last_name,
}: SubscriberAvatarProps) {
  const tone = avatarTones[avatarToneIndex(id, avatarTones.length)];
  const initials = subscriberInitials({ maternal_last_name, name, paternal_last_name });

  return (
    <Avatar className={className}>
      <AvatarFallback className={cn('font-semibold', tone)}>{initials}</AvatarFallback>
    </Avatar>
  );
}
