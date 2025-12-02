// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiUrl: 'https://edubooks.onrender.com/api',
  //apiUrl: 'http://127.0.0.1:8000/api',
  firebase: {
    apiKey: 'AIzaSyB2Q_bqmcwYQPmUwpCqNI5IfeKc8Tggfcc',
    authDomain: 'edubooks-94c14.firebaseapp.com',
    databaseURL: 'https://edubooks-94c14-default-rtdb.firebaseio.com',
    projectId: 'edubooks-94c14',
    storageBucket: 'edubooks-94c14.firebasestorage.app',
    messagingSenderId: '425633503294',
    appId: '1:425633503294:web:b0e5c88fc3e1d4d44b996f',
    measurementId: 'G-HZF9Q3LCW4'
  },
  supabase: {
    url: 'https://dlaspmegzblefvofvsng.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsYXNwbWVnemJsZWZ2b2Z2c25nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MDc5OTEsImV4cCI6MjA3NzA4Mzk5MX0.8jITxJouJI4ep2d9EHKWwYITLISiVCRxZST5E1ntZCo'
  }
};

//mauro

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
