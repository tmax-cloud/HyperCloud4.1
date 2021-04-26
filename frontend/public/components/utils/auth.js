export const getAccessToken = function() {
  return sessionStorage.getItem('accessToken');
};
// HyperAuth 연동 후, 사용하지 않음
export const getRefreshToken = function() {
  return sessionStorage.getItem('refreshToken');
};

export const getId = function() {
  return sessionStorage.getItem('id');
};

export const setAccessToken = function(at) {
  sessionStorage.setItem('accessToken', at);
  return;
};
// HyperAuth 연동 후, 사용하지 않음
export const setRefreshToken = function(rt) {
  sessionStorage.setItem('refreshToken', rt);
  return;
};

export const setId = function(id) {
  sessionStorage.setItem('id', id);
  return;
};

// 로그아웃 시 사용
export const resetLoginState = function() {
  sessionStorage.clear();
  return;
};

export const getUserGroup = function() {
  let usergroups = getParsedAccessToken().group;
  let result = '';
  if (usergroups?.length > 0) {
    result = '&' + usergroups.map(cur => `userGroup=${cur}`).join('&');
  }
  return result;
};

export const getParsedAccessToken = function() {
  const token = getAccessToken();
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join(''),
  );

  return JSON.parse(jsonPayload);
};
