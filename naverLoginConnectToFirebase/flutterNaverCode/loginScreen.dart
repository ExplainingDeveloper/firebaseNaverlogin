import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:uni_links3/uni_links.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:vecell/src/core/controller/auth_controller.dart';
import 'package:vecell/src/ui/auth/signUp.dart';
import 'package:vecell/src/ui/dashboard/link_page.dart';
import 'package:vecell/src/ui/utils/colors.dart';
import 'package:vecell/src/ui/utils/preference_utills.dart';
import 'package:vecell/src/ui/widget/button_widget.dart';
import 'package:vecell/src/ui/widget/icon_button_with_text_widget.dart';
import 'package:vecell/src/ui/widget/text_widget.dart';
import 'package:vecell/src/ui/widget/textfield_widget.dart';
import 'package:flutter_naver_login/flutter_naver_login.dart';

/**
 * this code is for illustration purpose only, i removed some code for security reasons.
 * so please add your own code for the missing parts.
 */
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool isChecked = false;

  @override
  void initState() {
    get();
    super.initState();
    initUniLinks();
  }

  Future<void> initUniLinks() async {
    final initialLink = await getInitialLink(); // flutter pub get uni_links
    if (initialLink != null) _handleDeepLink(initialLink);

    linkStream.listen((String? link) {
      _handleDeepLink(link!);
    }, onError: (err, stacktrace) {
      print("deep link error $err\n$stacktrace");
    });
  }

  Future<void> _handleDeepLink(String link) async {
    print("open depplink $link");
    final Uri uri = Uri.parse(link);

    if (uri.authority == 'login-callback') {
      String? firebaseToken = uri.queryParameters['firebaseToken'];
      String? name = uri.queryParameters['name'];
      String? profileImage = uri.queryParameters['profileImage'];

      await FirebaseAuth.instance
          .signInWithCustomToken(firebaseToken!)
          .then((value) => print("gotomain page") //navigateToMainPage()
              )
          .onError((error, stackTrace) {
        print("error $error");
      });
    }
  }

  naverlogin() async {
    String clientId = '<YOUR_NAVER_CLIENT_ID>'
    String redirectUrl = Uri.encodeComponent(
        "<this is your firebase cloud function url>");
    String state =
        base64Url.encode(List<int>.generate(16, (_) => Random().nextInt(255)));
    Uri redirectUri = Uri.parse(
        "https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=$clientId&state=$state&redirect_uri=$redirectUrl");
    await launchUrl(redirectUri);
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SingleChildScrollView(
        getNaverloginButton(),
      ),
    );
  }

  bool isLoginForNaver = false;
  String? accesTokenForNaver;
  String? expiresAtForNaver;
  String? tokenTypeForNaver;
  String? nameForNaver;
  String? refreshTokenForNaver;

  getNaverloginButton() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 20),
      child: Column(
        children: [
          Text('isLogin: $isLoginForNaver\n'),
          Text('accesToken: $accesTokenForNaver\n'),
          Text('refreshToken: $refreshTokenForNaver\n'),
          Text('tokenType: $tokenTypeForNaver\n'),
          Text('user: $nameForNaver\n'),
          ElevatedButton(
            onPressed: buttonLoginPressed,
            child: const Text("LogIn"),
          ),
        ],
      ),
    );
  }

  Future<void> buttonLoginPressed() async {
    try {
      naverlogin();
    } catch (error) {
      print(error.toString());
    }
  }
}
