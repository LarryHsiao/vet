// STUB: the team API is not built yet. This renders fixed sample rows so the
// page layout can be reviewed. Replace loadTeam() with the real endpoint.
type Member = { id: string; name: string };

const SAMPLE_TEAM: Member[] = [
  { id: "1", name: "Sample Person" },
  { id: "2", name: "Another Sample" },
];

function loadTeam(): Member[] {
  return SAMPLE_TEAM;
}

export function TeamList() {
  const members = loadTeam();
  return (
    <ul>
      {members.map((m) => (
        <li key={m.id}>{m.name} (sample data)</li>
      ))}
    </ul>
  );
}
