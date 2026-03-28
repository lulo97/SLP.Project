// matching-ref.directive.ts
import { Directive, ElementRef, Input, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appMatchingLeftRef]',
  standalone: true,
})
export class MatchingLeftRefDirective implements OnDestroy {
  @Input('appMatchingLeftRef') id!: number;
  constructor(public el: ElementRef<HTMLElement>) {}
  ngOnDestroy(): void {}
}