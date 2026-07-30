class LiveSessionController {
  String status = 'idle';
  String? lastError;

  Future<String?> runLive(String sessionId) async {
    status = 'live';
    try {
      final result = await _interpretTurn(sessionId);
      status = 'idle';
      return result;
    } catch (err) {
      // interpret-failure path — no test exercises this branch.
      status = 'error';
      lastError = err.toString();
      return null;
    }
  }

  Future<String?> onRefineTurn(String sessionId, String note) async {
    final refined = await _refineTurn(sessionId, note);
    if (!refined.ok) {
      // error path — no test exercises this branch either.
      lastError = refined.reason;
      return null;
    }
    return refined.turn;
  }

  Future<String> _interpretTurn(String sessionId) async =>
      'interpreted-$sessionId';

  Future<_RefineResult> _refineTurn(String sessionId, String note) async =>
      _RefineResult(ok: true, turn: 'refined-$sessionId', reason: null);
}

class _RefineResult {
  _RefineResult({required this.ok, this.turn, this.reason});

  final bool ok;
  final String? turn;
  final String? reason;
}
