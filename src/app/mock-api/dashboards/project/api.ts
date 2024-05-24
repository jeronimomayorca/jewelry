import { Injectable } from '@angular/core';
import { FuseMockApiService } from '@fuse/lib/mock-api';
import { project as projectData } from 'app/mock-api/dashboards/project/data';
import { cloneDeep } from 'lodash-es';

@Injectable({providedIn: 'root'})
export class ProjectMockApi
{
    private _project: any = projectData;


    constructor(private _fuseMockApiService: FuseMockApiService)
    {
        this.registerHandlers();
    }


    registerHandlers(): void
    {

        this._fuseMockApiService
            .onGet('api/dashboards/project')
            .reply(() => [200, cloneDeep(this._project)]);

    }
}
