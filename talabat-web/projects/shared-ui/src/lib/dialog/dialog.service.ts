import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { ComponentType } from '@angular/cdk/portal';
import { Injectable, inject } from '@angular/core';

export interface TalDialogConfig<D> {
  readonly ariaLabel: string;
  readonly data?: D;
  readonly maxWidth?: string;
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);

  openModal<R, D, C>(component: ComponentType<C>, config: TalDialogConfig<D>): DialogRef<R, C> {
    return this.dialog.open<R, D, C>(component, {
      ariaLabel: config.ariaLabel,
      ariaModal: true,
      autoFocus: 'first-heading',
      backdropClass: 'tal-dialog-backdrop',
      closeOnNavigation: true,
      disableClose: false,
      maxWidth: config.maxWidth ?? '32rem',
      panelClass: 'tal-dialog-panel',
      restoreFocus: true,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      data: config.data,
    });
  }

  openSheet<R, D, C>(component: ComponentType<C>, config: TalDialogConfig<D>): DialogRef<R, C> {
    return this.dialog.open<R, D, C>(component, {
      ariaLabel: config.ariaLabel,
      ariaModal: true,
      autoFocus: 'first-heading',
      backdropClass: 'tal-dialog-backdrop',
      closeOnNavigation: true,
      disableClose: false,
      maxWidth: '100vw',
      panelClass: 'tal-sheet-panel',
      restoreFocus: true,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      data: config.data,
    });
  }
}
