const functions = require('@google-cloud/functions-framework');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

const fetch = require('node-fetch');

admin.initializeApp();

// This function will be called every time someone logs in
functions.http('main', (req, res) => {
    console.log("Successfully hit the cloud function...");
    cors(req, res, async () => {
        const { code, state } = req.query;

        const client_id = '6sIL21sdwxsMtSRCB2NP';
        const client_secret = 'MoD29IFyGo'; // If you want to be extra secure, put this in a Google Cloud Secret
        //DO NOT ENCODE. if you add encod on the redirect_url -> there will be an error.
        const redirect_uri = 'optimalauthcallbackscheme://login-callback';

        try {
            console.log("Calling access token...");

            const accessToken = await fetchNaverToken(code, state, client_id, client_secret, redirect_uri); // A token that lets us ask Naver about the user's details

            const naverProfile = await fetchNaverUserProfile(accessToken);

            const firebaseToken = await createFirebaseToken(naverProfile); // JWT token that says we authenticated the user, so Firebase can trust anyone who has it
                        console.log("redirecting");

            res.redirect(`${redirect_uri}?firebaseToken=${firebaseToken}&name=${encodeURIComponent(naverProfile.name)}`); //}&profileImage=${encodeURIComponent(naverProfile.profile_image)
        } catch (error) {
            console.error('Error processing the authentication:', error);
            res.status(500).send(error.message);
        }
    });
});
async function fetchNaverToken(code, state, client_id, client_secret, redirect_uri) {
    const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${client_id}&client_secret=${client_secret}&redirect_uri=${redirect_uri}&code=${code}&state=${state}`;

const response = await fetchWithRetry(tokenUrl, { method: 'GET', timeout: 10000 });
                console.log("fetchNaverToken got response ...");

    const data = await response.json();
                    console.log(`fetchNaverToken response data: ${data} `);


    if (!response.ok) {
        throw new Error(`fetchNaverToken Error: ${response.status} ${response.statusText}`);
    }

    if (data.error) {
        throw new Error(`fetchNaverToken Error: ${data.error} ${data.error_description}`);
    }

    return data.access_token;
}
async function fetchNaverUserProfile(accessToken) {
    const profileUrl = 'https://openapi.naver.com/v1/nid/me';
                console.log("fetchNaverUserProfile starting ...");

    const response = await fetch(profileUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Error fetching Naver user profile: ${response.status} ${response.statusText}`);
    }

    if (data.error) {
        throw new Error(`Error from Naver: ${data.error} ${data.error_description}`);
    }

    console.log(`Got the following data from Naver: ${JSON.stringify(data.response)}`);
    return data.response;
}
async function createFirebaseToken(naverProfile) {
    console.log(`create custom token ${JSON.stringify(naverProfile)}`);

    const uid = naverProfile.id;
    console.log(`uid ${uid}`);

    try {
        await admin.auth().getUser(uid);
    } catch (error) {
        // If the user does not exist, create them
        if (error.code === 'auth/user-not-found') {
            await admin.auth().createUser({
                uid: uid,
                // displayName: naverProfile.name,
                // photoURL: naverProfile.profile_image,
                // email: naverProfile.email,
                // emailVerified: true
            });
        } else {
            console.log(`error createFirebaseToken ${error}`);
            throw error;
        }
    }

    return admin.auth().createCustomToken(uid);
}
async function fetchWithRetry(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) return response;
        } catch (error) {
            console.error(`Retry ${i + 1} failed:`, error);
            if (i === retries - 1) throw error; // 모든 재시도 실패 시 에러 반환
        }
    }
}