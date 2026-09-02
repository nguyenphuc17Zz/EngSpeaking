"use client";
import { Badge } from "@/components/ui/badge";
import type { FoundationSkill } from "@/types/foundation";
import { getSkillMeta } from "@/lib/foundation/skills/taxonomy";

export function SkillBadge({ skill }: { skill: FoundationSkill }) {
  const meta = getSkillMeta(skill);
  return <Badge variant="secondary" className="text-xs">{meta?.labelVi || skill}</Badge>;
}
