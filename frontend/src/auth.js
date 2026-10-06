const sessionKeys = {
  customer: "marketplaceCustomerSession",
  seller: "marketplaceSellerSession",
};

export function getMarketplaceSession(role) {
  try {
    const session = JSON.parse(sessionStorage.getItem(sessionKeys[role]) || "null");
    return session?.user?.role === role && session?.token ? session : null;
  } catch {
    return null;
  }
}

export function saveMarketplaceSession(role, session) {
  sessionStorage.setItem(sessionKeys[role], JSON.stringify(session));
}

export function clearMarketplaceSession(role) {
  sessionStorage.removeItem(sessionKeys[role]);
}

export function marketplaceFetch(role, url, options = {}) {
  const session = getMarketplaceSession(role);
  if (!session) {
    throw new Error("Your session has expired. Please sign in again.");
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${session.token}`,
    },
  });
}
