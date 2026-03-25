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

import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  NgZone,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import {Router} from '@angular/router';
import {AuthService} from './../common/services/auth.service';
import {UserModel} from './../common/models/user.model';
import {MatSnackBar} from '@angular/material/snack-bar';
import {handleErrorSnackbar} from '../utils/handleMessageSnackbar';
import {isPlatformBrowser} from '@angular/common';
import {environment} from '../../environments/environment';

// google.accounts is injected by the GIS script in index.html
declare const google: any;

const HOME_ROUTE = '/';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements AfterViewInit {
  // Containers where the GIS Sign In With Google button will be rendered.
  // Using renderButton opens a real OAuth popup — no third-party cookies,
  // no FedCM/One Tap timeout, no Firebase Auth signInWithPopup dependency.
  @ViewChild('mobileGisBtn') mobileGisBtn!: ElementRef<HTMLDivElement>;
  @ViewChild('desktopGisBtn') desktopGisBtn!: ElementRef<HTMLDivElement>;

  loader = false;
  isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    public ngZone: NgZone,
    private _snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    if (!this.isBrowser || typeof google === 'undefined') return;

    // Initialize GIS once. The callback fires when the user completes sign-in
    // via the rendered button's popup.
    google.accounts.id.initialize({
      client_id: environment.GOOGLE_CLIENT_ID,
      callback: (response: any) => {
        // GIS callbacks run outside Angular's zone; wrap to trigger CD.
        this.ngZone.run(() => this.handleGoogleCredential(response));
      },
    });

    const btnOptions = {
      type: 'standard',
      theme: 'filled_blue',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
    };

    if (this.mobileGisBtn?.nativeElement) {
      google.accounts.id.renderButton(this.mobileGisBtn.nativeElement, btnOptions);
    }
    if (this.desktopGisBtn?.nativeElement) {
      google.accounts.id.renderButton(this.desktopGisBtn.nativeElement, btnOptions);
    }
  }

  private handleGoogleCredential(response: any): void {
    if (!response?.credential) {
      this.handleLoginError({
        message: 'Google Sign-In did not return a credential. Please try again.',
      });
      return;
    }

    this.loader = true;
    this.authService.processGoogleCredential$(response.credential).subscribe({
      next: () => {
        this.loader = false;
        void this.router.navigate([HOME_ROUTE]);
      },
      error: (err: any) => {
        this.handleLoginError(err);
      },
    });
  }

  private handleLoginError(error: any, postErrorAction?: () => void): void {
    this.loader = false;
    handleErrorSnackbar(this._snackBar, error, 'Login Error');
    if (postErrorAction) postErrorAction();
  }

  redirect(user: UserModel): void {
    if (this.isBrowser) {
      localStorage.setItem('USER_DETAILS', JSON.stringify(user));
    }
    this.loader = false;
    void this.router.navigate([HOME_ROUTE]);
  }
}
