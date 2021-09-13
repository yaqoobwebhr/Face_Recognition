const AUTH_TYPES = {
  FACEBOOK: "FACEBOOK",
  GOOGLE: "GOOGLE",
  MICROSOFT: "MICROSOFT",
  TWITTER: "TWITTER",
};

const authWithFB = () => console.log("Authing with FB...");
const authWithGoogle = () => console.log("Authing with Google...");
const authWithMicrosoft = () => console.log("Authing with Microsoft...");
const authWithTwitter = () => console.log("Authing with Twitter...");

const getAuth = (method) =>
  ({
    [AUTH_TYPES.FACEBOOK]: authWithFB,
    [AUTH_TYPES.GOOGLE]: authWithGoogle,
    [AUTH_TYPES.MICROSOFT]: authWithMicrosoft,
    [AUTH_TYPES.TWITTER]: authWithTwitter,
  }[method]);

const auth = getAuth(AUTH_TYPES.MICROSOFT);
auth();
