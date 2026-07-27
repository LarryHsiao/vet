import { useEffect, useState } from "react";

type Member = { id: string; name: string; email: string };

export function TeamList({ orgId }: { orgId: string }) {
  const [members, setMembers] = useState<Member[] | null>(null);

  useEffect(() => {
    fetch(`/api/orgs/${orgId}/members`)
      .then((r) => r.json())
      .then(setMembers)
      .catch(() => {});
  }, [orgId]);

  if (!members) return null;

  return (
    <ul>
      {members.map((m) => (
        <li key={m.id}>
          {m.name} <span className="text-gray-500">{m.email}</span>
        </li>
      ))}
    </ul>
  );
}
