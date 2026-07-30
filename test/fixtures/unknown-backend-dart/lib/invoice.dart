import "package:dio/dio.dart";

Future<List<dynamic>> loadInvoices() async {
  final response = await Dio().get(
    "https://api.acme-billing-service.io/v1/invoices",
  );
  return response.data as List<dynamic>;
}
