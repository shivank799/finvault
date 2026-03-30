'use strict';

const { createRequestSupabaseClient } = require('../utils/supabase/client');

async function attachSupabaseSession(req, _res, next) {
  const header = req.headers.authorization;
  const accessToken = header?.startsWith('Bearer ') ? header.slice(7) : null;

  try {
    req.supabase = createRequestSupabaseClient(accessToken);
    req.supabaseUser = null;

    if (!accessToken) {
      return next();
    }

    const {
      data: { user },
      error,
    } = await req.supabase.auth.getUser(accessToken);

    if (!error) {
      req.supabaseUser = user || null;
    }
  } catch (_error) {
    req.supabase = null;
    req.supabaseUser = null;
  }

  next();
}

module.exports = { attachSupabaseSession };
