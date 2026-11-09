import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminSessionService } from '../../../../core/services/admin-session.service';
import { Button } from '../../../../shared/components/button/button';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Button],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(AdminSessionService);
  private readonly cd = inject(ChangeDetectorRef);
  busy = false;
  error = '';
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
      ],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  get emailInvalid(): boolean {
    return this.form.controls.email.touched && this.form.controls.email.invalid;
  }

  get passwordInvalid(): boolean {
    return this.form.controls.password.touched && this.form.controls.password.invalid;
  }

  async onLogin(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy) return;
    this.busy = true;
    this.error = '';
    try {
      await this.session.login(
        this.form.controls.email.value.trim(),
        this.form.controls.password.value,
      );
      this.form.controls.password.reset();
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/admin/home';
      await this.router.navigateByUrl(
        returnUrl.startsWith('/admin/') && !returnUrl.startsWith('/admin/login')
          ? returnUrl
          : '/admin/home',
      );
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : 'Không đăng nhập được. Vui lòng thử lại.';
    } finally {
      this.busy = false;
      this.cd.markForCheck();
    }
  }
}
