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
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {of, throwError} from 'rxjs';
import {LoginComponent} from './login.component';
import {AuthService} from './../common/services/auth.service';
import {UserModel} from './../common/models/user.model';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Router} from '@angular/router';
import {Injector, NgZone} from '@angular/core';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {AppInjector, setAppInjector} from '../app-injector';
import {NotificationService} from '../common/services/notification.service';

class MockAuthService {
  processGoogleCredential$ = jasmine.createSpy('processGoogleCredential$');
}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: MockAuthService;
  let router: Router;
  let ngZone: NgZone;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  const mockUser: UserModel = {
    id: '123',
    name: 'Test User',
    email: 'test@example.com',
    picture:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  };

  beforeEach(async () => {
    const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
    const notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'show',
    ]);

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          {path: '', component: LoginComponent},
        ]),
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        NoopAnimationsModule,
      ],
      declarations: [LoginComponent],
      providers: [
        {provide: AuthService, useClass: MockAuthService},
        {provide: MatSnackBar, useValue: snackBarSpy},
        {provide: NotificationService, useValue: notificationServiceSpy},
      ],
    }).compileComponents();

    setAppInjector(TestBed.inject(Injector));

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges(true);
    authService = TestBed.inject(AuthService) as unknown as MockAuthService;
    router = TestBed.inject(Router);
    ngZone = TestBed.inject(NgZone);
    snackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    notificationService = TestBed.inject(
      NotificationService,
    ) as jasmine.SpyObj<NotificationService>;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('handleGoogleCredential (via private access)', () => {
    let consoleErrorSpy: jasmine.Spy;

    beforeEach(() => {
      consoleErrorSpy = spyOn(console, 'error');
    });

    it('should show loader and navigate on successful credential', fakeAsync(() => {
      authService.processGoogleCredential$.and.returnValue(of('test-token'));
      spyOn(router, 'navigate');

      (component as any).handleGoogleCredential({credential: 'fake-jwt'});
      tick();

      expect(authService.processGoogleCredential$).toHaveBeenCalledWith(
        'fake-jwt',
      );
      expect(component.loader).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    }));

    it('should call handleLoginError when credential is missing', fakeAsync(() => {
      spyOn(component as any, 'handleLoginError');

      (component as any).handleGoogleCredential({credential: null});
      tick();

      expect((component as any).handleLoginError).toHaveBeenCalled();
      expect(authService.processGoogleCredential$).not.toHaveBeenCalled();
    }));

    it('should call handleLoginError when processGoogleCredential$ errors', fakeAsync(() => {
      consoleErrorSpy.and.stub();
      const error = new Error('Backend sync failed');
      authService.processGoogleCredential$.and.returnValue(
        throwError(() => error),
      );
      spyOn(component as any, 'handleLoginError');

      (component as any).handleGoogleCredential({credential: 'fake-jwt'});
      tick();

      expect(component.loader).toBeFalse();
      expect((component as any).handleLoginError).toHaveBeenCalledWith(error);
    }));
  });

  describe('handleLoginError', () => {
    it('should hide loader and show snackbar', () => {
      component.loader = true;
      const errorMessage = {message: 'Test error message'};

      component['handleLoginError'](errorMessage);

      expect(component.loader).toBeFalse();
      expect(notificationService.show).toHaveBeenCalledWith(
        errorMessage.message,
        'error',
        'cross-in-circle-white',
        undefined,
        20000,
      );
    });

    it('should execute postErrorAction if provided', () => {
      const postErrorAction = jasmine.createSpy('postErrorAction');
      component['handleLoginError']({message: 'Test error'}, postErrorAction);
      expect(postErrorAction).toHaveBeenCalled();
    });
  });

  describe('redirect', () => {
    it('should store user details in localStorage, hide loader and navigate', () => {
      spyOn(localStorage, 'setItem');
      spyOn(router, 'navigate');
      component.loader = true;

      component.redirect(mockUser);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'USER_DETAILS',
        JSON.stringify(mockUser),
      );
      expect(component.loader).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
