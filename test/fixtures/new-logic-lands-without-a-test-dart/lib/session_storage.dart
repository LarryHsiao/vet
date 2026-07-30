class StoredSession {
  StoredSession({required this.id});

  final String id;
}

List<StoredSession> loadStoredSessions(String raw) {
  try {
    final ids = _decodeIds(raw);
    return ids.map((id) => StoredSession(id: id)).toList();
  } catch (_) {
    // corrupt-data path — tested below, unlike live_session_controller.dart's siblings.
    return [];
  }
}

List<String> _decodeIds(String raw) {
  if (!raw.startsWith('[') || !raw.endsWith(']')) {
    throw const FormatException('not a json array');
  }
  final inner = raw.substring(1, raw.length - 1);
  return inner.isEmpty ? [] : inner.split(',');
}

Map<String, String> stripForStorage(Map<String, String> session) {
  final rest = Map<String, String>.from(session);
  rest.remove('token');
  return rest;
}
