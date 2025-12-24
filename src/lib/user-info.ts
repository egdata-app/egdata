export function getTempUserId() {
  let tempUserId = sessionStorage.getItem("EGDATA_APP_TEMP_USER_ID");
  if (!tempUserId) {
    tempUserId = Math.random().toString(36).slice(2);
    sessionStorage.setItem("EGDATA_APP_TEMP_USER_ID", tempUserId);
  }

  return tempUserId;
}

export function getSession(): {
  id: string;
  startedAt: number;
  lastActiveAt: number;
} {
  const session = sessionStorage.getItem("EGDATA_APP_SESSION");
  if (session) {
    // Update last active time
    const parsedSession = JSON.parse(session);
    parsedSession.lastActiveAt = Date.now();
    sessionStorage.setItem("EGDATA_APP_SESSION", JSON.stringify(parsedSession));
    return parsedSession;
  }

  const newSession = {
    id: Math.random().toString(36).slice(2),
    startedAt: Date.now(),
    lastActiveAt: Date.now(),
  };

  sessionStorage.setItem("EGDATA_APP_SESSION", JSON.stringify(newSession));
  return newSession;
}
