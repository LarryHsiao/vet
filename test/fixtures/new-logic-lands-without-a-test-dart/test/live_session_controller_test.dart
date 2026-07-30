import 'package:test/test.dart';

import '../lib/live_session_controller.dart';

void main() {
  test('runLive sets status back to idle on success', () async {
    final controller = LiveSessionController();
    await controller.runLive('session-1');
    const expectedStatus = 'idle';
    expect(controller.status, expectedStatus);
  });

  test('onRefineTurn returns the refined turn on success', () async {
    final controller = LiveSessionController();
    final refined = await controller.onRefineTurn('session-1', 'shorter');
    expect(refined, isNotNull);
  });
}
