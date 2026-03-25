/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {Component, NgZone, Inject, PLATFORM_ID} from '@angular/core';
import {Router} from '@angular/router';
import {AuthService} from './../common/services/auth.service';
import {UserModel} from './../common/models/user.model';
import {MatSnackBar} from '@angular/material/snack-bar';
import { handleErrorSnackbar } from '../utils/handleMessageSnackbar';
import {isPlatformBrowser} from '@angular/common';

const HOME_ROUTE = '/';

interface LooseObject {
  [key: string]: any;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loader = false;
  invalidLogin = false;
  errorMessage = '';
  isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    public ngZone: NgZone,
    private _snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {}

  loginWithGoogle() {
    this.loader = true;
    this.invalidLogin = false;
    this.errorMessage = '';

    // Uses signInWithPopup which works reliably in modern browsers without
    // third-party cookies. The One Tap / redirect flows are not used because
    // they depend on third-party cookies that are increasingly blocked.
    //
    // IMPORTANT (Issue 4 — Authorized Domains): For this popup to succeed,
    // the deployed domain (e.g. tidal-theater-491221-i7.web.app) must be
    // listed in Firebase Console → Authentication → Settings → Authorized
    // Domains. localhost is allowed by default for local development.
    this.authService.signInWithGoogleFirebase().subscribe({
      next: (_firebaseToken: string) => {
        this.ngZone.run(() => {
          this.loader = false;
          void this.router.navigate([HOME_ROUTE]);
        });
      },
      error: (error: any) => {
        this.loader = false;
        // auth/popup-closed-by-user and auth/cancelled-popup-request are
        // non-error cases (user dismissed the popup) — show a gentle message.
        if (
          error?.code === 'auth/popup-closed-by-user' ||
          error?.code === 'auth/cancelled-popup-request'
        ) {
          this.handleLoginError({
            message: 'Sign-in was cancelled. Please try again.',
          });
        } else if (error?.code === 'auth/popup-blocked') {
          this.handleLoginError({
            message:
              'Pop-up was blocked by the browser. Please allow pop-ups for this site and try again.',
          });
        } else {
          this.handleLoginError(
            error || {
              message:
                'An unexpected error occurred during sign-in. Please try again.',
            },
          );
        }
        console.error('Google Sign-In error:', error);
      },
    });
  }

  private handleLoginError(
    error: any,
    postErrorAction?: () => void,
  ) {
    this.loader = false;
    handleErrorSnackbar(this._snackBar, error, 'Login Error');
    if (postErrorAction) {
      postErrorAction();
    }
  }

  redirect(user: UserModel) {
    if (this.isBrowser) {
        localStorage.setItem('USER_DETAILS', JSON.stringify(user));
    }
    this.loader = false;
    void this.router.navigate([HOME_ROUTE]);
  }
}
