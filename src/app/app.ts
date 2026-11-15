import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FontSizeService } from './core/theme/font-size.service';
import { ToastHostComponent } from './shared/components/toast-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHostComponent],
  templateUrl: './app.html',
})
export class App {
  constructor() {
    inject(FontSizeService);
  }
}
