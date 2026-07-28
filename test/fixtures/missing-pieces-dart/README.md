# Fixtures: everything it needs is actually here (Dart)

Deliberately incomplete. Not built, imported, or shipped.

| Import in `lib/main.dart` | Must trip? | Why |
|---|---|---|
| `package:dio/dio.dart` | **Yes** | Imported but `dio` is absent from `pubspec.yaml`'s dependencies — a fresh `pub get` will not have it. |
| `widgets/header.dart` | **Yes** | Imported but the file does not exist. |
| `widgets/footer.dart` | **No** | Imported and present. Flagging it means the check is not resolving relative imports. |

Note `widgets/header.dart` is *absent by design*. Do not create it to "fix" the fixture.
