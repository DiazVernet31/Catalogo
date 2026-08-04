// Importa el cliente de Supabase (puedes usar el CDN en tu HTML)
const supabaseUrl = 'https://njaqtzpympuvaoymxazv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qYXF0enB5bXB1dmFveW14YXp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyMTg5MjksImV4cCI6MjA5OTc5NDkyOX0.S0dwgx29tCd6xTfsgqjqqqlLECeFVRjnoNIMJH2tXv0';

const supabase = supabase.createClient(supabaseUrl, supabaseKey);