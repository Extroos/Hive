import React, { createContext, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';

const SupabaseContext = createContext();

const supabaseUrl = 'https://njtptsmsmboxapjhwtqf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qdHB0c21zbWJveGFwamh3dHFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4NDAyMzAsImV4cCI6MjA1NTQxNjIzMH0.xoKoFyRpbqd7ZJC__fC4XJPJ6va6FmX1xuMWysn255U';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SupabaseProvider = ({ children }) => {
  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  return useContext(SupabaseContext);
}; 