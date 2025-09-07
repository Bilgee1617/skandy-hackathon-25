import 'react-native-url-polyfill/auto';
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './app/login';
import { Session } from '@supabase/supabase-js';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      {session && session.user ? <Slot /> : <Auth />}
    </>
  );
}
