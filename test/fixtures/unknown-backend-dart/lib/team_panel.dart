import "api_client.dart";

Future<List<dynamic>> loadTeam() async {
  final response = await apiClient.get("/v1/team");
  return response.data as List<dynamic>;
}
