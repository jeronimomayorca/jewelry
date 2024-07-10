import { TextFieldModule } from '@angular/cdk/text-field';
import { AsyncPipe, NgClass, NgFor, NgIf } from '@angular/common';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    Inject,
    OnDestroy,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRippleModule } from '@angular/material/core';
import {
    MAT_DIALOG_DATA,
    MatDialogModule,
    MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { NotesService } from 'app/modules/admin/inventory/inventory.service';
import { products } from '../../../../mock-api/apps/notes/data';
import {
    Label,
    Note,
    Task,
    Product,
} from 'app/modules/admin/inventory/inventory.types';
import {
    debounceTime,
    map,
    Observable,
    of,
    Subject,
    switchMap,
    takeUntil,
} from 'rxjs';

@Component({
    selector: 'notes-details',
    templateUrl: './details.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        NgIf,
        MatButtonModule,
        MatIconModule,
        FormsModule,
        TextFieldModule,
        NgFor,
        MatCheckboxModule,
        NgClass,
        MatRippleModule,
        MatMenuModule,
        MatDialogModule,
        AsyncPipe,
    ],
})
export class NotesDetailsComponent implements OnInit, OnDestroy {
    product$: Observable<Product>;
    note$: Observable<Note>;
    labels$: Observable<Label[]>;

    productChanged: Subject<Product> = new Subject<Product>();
    noteChanged: Subject<Note> = new Subject<Note>();
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        @Inject(MAT_DIALOG_DATA) private _dataProducts: { product: Product },
        private _notesService: NotesService,
        private _matDialogRef: MatDialogRef<NotesDetailsComponent>
    ) {}

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Edit
        if (this._dataProducts.product.id) {
            // Request the data from the server
            this._notesService
                .getProductById(this._dataProducts.product.id)
                .subscribe();

            // Get the note
            this.product$ = this._notesService.product$;
        }

        // Get the labels
        this.labels$ = this._notesService.labels$;
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Create a new note
     *
     * @param note
     */
    createNote(note: Note): void {
        this._notesService
            .createNote(note)
            .pipe(
                map(() => {
                    // Get the note
                    this.note$ = this._notesService.note$;
                })
            )
            .subscribe();
    }

    /**
     * Upload image to given note
     *
     * @param note
     * @param fileList
     */
    uploadImage(note: Note, fileList: FileList): void {
        // Return if canceled
        if (!fileList.length) {
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png'];
        const file = fileList[0];

        // Return if the file is not allowed
        if (!allowedTypes.includes(file.type)) {
            return;
        }

        this._readAsDataURL(file).then((data) => {
            // Update the image
            note.image = data;

            // Update the note
            this.noteChanged.next(note);
        });
    }

    /**
     * Add task to the given note
     *
     * @param note
     * @param task
     */
    addTaskToNote(note: Note, task: string): void {
        if (task.trim() === '') {
            return;
        }

        // Add the task
        this._notesService.addTask(note, task).subscribe();
    }

    /**
     * Remove the given task from given note
     *
     * @param note
     * @param task
     */
    removeTaskFromNote(note: Note, task: Task): void {
        // Remove the task
        note.tasks = note.tasks.filter((item) => item.id !== task.id);

        // Update the note
        this.noteChanged.next(note);
    }

    /**
     * Update the given task on the given note
     *
     * @param note
     * @param task
     */
    updateTaskOnNote(note: Note, task: Task): void {
        // If the task is already available on the item
        if (task.id) {
            // Update the note
            this.noteChanged.next(note);
        }
    }

    /**
     * Is the given product has the given label
     *
     * @param product
     * @param label
     */
    isProductHasLabel(product: Product, label: Label): boolean {
        return !!product.labels.find((item) => item.id === label.id);
    }

    /**
     * Is the given note has the given label
     *
     * @param note
     * @param label
     */
    isNoteHasLabel(note: Note, label: Label): boolean {
        return !!note.labels.find((item) => item.id === label.id);
    }

    /**
     * Toggle the given label on the given note
     *
     * @param note
     * @param label
     */
    toggleLabelOnNote(note: Note, label: Label): void {
        // If the note already has the label
        if (this.isNoteHasLabel(note, label)) {
            note.labels = note.labels.filter((item) => item.id !== label.id);
        }
        // Otherwise
        else {
            note.labels.push(label);
        }

        // Update the note
        this.noteChanged.next(note);
    }

    /**
     * Toggle archived status on the given note
     *
     * @param note
     */
    toggleArchiveOnNote(note: Note): void {
        note.archived = !note.archived;

        // Update the note
        this.noteChanged.next(note);

        // Close the dialog
        this._matDialogRef.close();
    }

    /**
     * Update the note details
     *
     * @param note
     */
    updateProductDetails(product: Product): void {
        this.noteChanged.next(product);
    }

    /**
     * Delete the given note
     *
     * @param note
     */
    deleteNote(note: Note): void {
        this._notesService.deleteNote(note).subscribe((isDeleted) => {
            // Return if the note wasn't deleted...
            if (!isDeleted) {
                return;
            }

            // Close the dialog
            this._matDialogRef.close();
        });
    }

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Read the given file for demonstration purposes
     *
     * @param file
     */
    private _readAsDataURL(file: File): Promise<any> {
        // Return a new promise
        return new Promise((resolve, reject) => {
            // Create a new reader
            const reader = new FileReader();

            // Resolve the promise on success
            reader.onload = (): void => {
                resolve(reader.result);
            };

            // Reject the promise on error
            reader.onerror = (e): void => {
                reject(e);
            };

            // Read the file as the
            reader.readAsDataURL(file);
        });
    }
}