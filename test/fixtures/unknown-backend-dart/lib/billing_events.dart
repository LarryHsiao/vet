import "package:dio/dio.dart";

Future<void> trackEvent(String event) async {
  await Dio().post("https://api.acme.io/v1/events", data: {"event": event});
}
