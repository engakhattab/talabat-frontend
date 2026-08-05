import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dialog } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';

import { ButtonComponent } from './button/button.component';
import { DialogService } from './dialog/dialog.service';
import { ErrorStateComponent } from './error-state/error-state.component';
import { InputComponent } from './input/input.component';
import { StatusChipComponent } from './status-chip/status-chip.component';

@Component({ template: '<h2>Dialog content</h2>' })
class DialogContentComponent {}

describe('shared UI primitives', () => {
  it('prevents button output while busy and emits when available', () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    const pressed = vi.fn();
    fixture.componentInstance.pressed.subscribe(pressed);
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');

    button.click();
    expect(pressed).not.toHaveBeenCalled();

    fixture.componentRef.setInput('busy', false);
    fixture.detectChanges();
    button.click();
    expect(pressed).toHaveBeenCalledOnce();
  });

  it('connects an invalid input to its error text and emits values', () => {
    const fixture = TestBed.createComponent(InputComponent);
    const valueChange = vi.fn();
    fixture.componentInstance.valueChange.subscribe(valueChange);
    fixture.componentRef.setInput('inputId', 'name');
    fixture.componentRef.setInput('label', 'Name');
    fixture.componentRef.setInput('error', 'Name is required');
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.value = 'Talabat';
    input.dispatchEvent(new Event('input'));

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('name-error');
    expect(valueChange).toHaveBeenCalledWith('Talabat');
  });

  it('emits retry intent from an error state', () => {
    const fixture = TestBed.createComponent(ErrorStateComponent);
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    fixture.componentRef.setInput('title', 'Could not load restaurants');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(retry).toHaveBeenCalledOnce();
  });

  it('renders a semantic status chip', () => {
    const fixture = TestBed.createComponent(StatusChipComponent);
    fixture.componentRef.setInput('label', 'Available');
    fixture.componentRef.setInput('tone', 'success');
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('span') as HTMLSpanElement;
    expect(chip.textContent).toContain('Available');
    expect(chip.classList).toContain('tal-status-chip--success');
  });

  it('opens typed CDK dialogs with focus restoration and scroll blocking', () => {
    const open = vi.fn().mockReturnValue({});
    const block = vi.fn().mockReturnValue('block-strategy');

    TestBed.configureTestingModule({
      providers: [
        DialogService,
        { provide: Dialog, useValue: { open } },
        { provide: Overlay, useValue: { scrollStrategies: { block } } },
      ],
    });

    TestBed.inject(DialogService).openModal<
      string,
      { readonly id: number },
      DialogContentComponent
    >(DialogContentComponent, { ariaLabel: 'Example dialog', data: { id: 1 } });

    expect(block).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith(
      DialogContentComponent,
      expect.objectContaining({
        ariaModal: true,
        autoFocus: 'first-heading',
        disableClose: false,
        restoreFocus: true,
        scrollStrategy: 'block-strategy',
      }),
    );
  });
});
