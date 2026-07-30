import "package:dio/dio.dart";

const apiBase = String.fromEnvironment(
  "API_BASE",
  defaultValue: "https://api.acme.com",
);

final apiClient = Dio(BaseOptions(baseUrl: apiBase));
