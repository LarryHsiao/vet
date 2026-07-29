import 'package:flutter/material.dart';

// STUB: the team API is not built yet. This renders fixed sample rows so the
// page layout can be reviewed. Replace loadTeam() with the real endpoint.
const List<String> sampleTeam = ['Sample Person', 'Another Sample'];

List<String> loadTeam() => sampleTeam;

class TeamList extends StatelessWidget {
  const TeamList({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [for (final name in loadTeam()) Text('$name (sample data)')],
    );
  }
}
