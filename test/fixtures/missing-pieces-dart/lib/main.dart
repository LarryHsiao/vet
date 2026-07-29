import 'package:dio/dio.dart';
import 'widgets/header.dart';
import 'widgets/footer.dart';

void main() {
  final client = Dio();
  print(buildHeader());
  print(buildFooter());
  print(client);
}
