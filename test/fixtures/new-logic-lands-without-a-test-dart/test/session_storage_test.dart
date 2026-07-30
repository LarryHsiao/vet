import 'package:test/test.dart';

import '../lib/session_storage.dart';

void main() {
  test('loadStoredSessions parses a valid array', () {
    final sessions = loadStoredSessions('[a,b]');
    const expectedLength = 2;
    expect(sessions.length, expectedLength);
  });

  test('loadStoredSessions returns empty list on corrupt data', () {
    final sessions = loadStoredSessions('not-json');
    const expectedLength = 0;
    expect(sessions.length, expectedLength);
  });

  test('stripForStorage removes the token field', () {
    final result = stripForStorage({'id': 'a', 'token': 'secret'});
    final expected = {'id': 'a'};
    expect(result, expected);
  });
}
