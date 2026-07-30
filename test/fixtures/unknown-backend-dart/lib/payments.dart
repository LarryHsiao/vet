import "package:dio/dio.dart";

Future<Map<String, dynamic>> loadPaymentMethods(String customerId) async {
  final response = await Dio().get(
    "https://api.stripe.com/v1/customers/$customerId/payment_methods",
  );
  return response.data as Map<String, dynamic>;
}
