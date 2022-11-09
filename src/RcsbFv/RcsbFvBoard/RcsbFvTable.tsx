import * as React from "react";
import SortableList, {SortableItem} from 'react-easy-sort'
import arrayMove from 'array-move'

import {
    DomainViewInterface,
    EventType, MoveTrackInterface,
    RcsbFvContextManager,
    RcsbFvContextManagerInterface,
    SetSelectionInterface,
    TrackDataInterface,
    TrackVisibilityInterface
} from "../RcsbFvContextManager/RcsbFvContextManager";
import {RcsbSelection} from "../../RcsbBoard/RcsbSelection";
import {RcsbFvBoardFullConfigInterface} from "./RcsbFvBoard";
import {
    RcsbFvBoardConfigInterface,
    RcsbFvDisplayConfigInterface,
    RcsbFvRowConfigInterface
} from "../RcsbFvConfig/RcsbFvConfigInterface";
import {RcsbFvDefaultConfigValues, RcsbFvDisplayTypes} from "../RcsbFvConfig/RcsbFvDefaultConfigValues";
import {RcsbFvRow} from "../RcsbFvRow/RcsbFvRow";
import classes from "../RcsbFvStyles/RcsbFvRow.module.scss";
import {Subscription} from "rxjs";
import uniqid from 'uniqid';
import {RowConfigFactory} from "./Utils/RowConfigFactory";
import {RowStatusMap} from "./Utils/RowStatusMap";
import {RcsbScaleInterface} from "../../RcsbBoard/RcsbD3/RcsbD3ScaleFactory";


interface RcsbFvTableInterface extends RcsbFvBoardFullConfigInterface {
    readonly boardId: string;
    readonly contextManager: RcsbFvContextManager;
    readonly resolve: ()=> void;
    readonly xScale: RcsbScaleInterface;
    readonly selection: RcsbSelection;
    readonly rowStatusMap: RowStatusMap;
    readonly rowConfigData: Array<RcsbFvRowConfigInterface & {key:string}>;
}

/**Board React component state interface*/
interface RcsbFvTableState {
    order: Array<RcsbFvRowConfigInterface & {key:string}>;
    axisKey: string;
}

export class RcsbFvTable extends React.Component <RcsbFvTableInterface, RcsbFvTableState> {

    /**Inner div board DOM element id*/
    private readonly boardId : string;
    /**Subscription to events*/
    private subscription: Subscription;
    /**Global d3 Xscale object shaed among all board tracks*/
    private readonly xScale: RcsbScaleInterface;
    /**Global selection shared among all tracks*/
    private readonly selection:RcsbSelection;
    /**Promise resolve callback when board is complete*/
    private resolveOnReady: (()=>void) | undefined = undefined;

    readonly state: RcsbFvTableState = {
        order:  this.props.rowConfigData,
        axisKey: uniqid("rcsbFvAxis_key_")
    };

    constructor(props: RcsbFvTableInterface) {
        super(props);
        this.resolveOnReady = props.resolve;
        this.xScale = props.xScale;
        this.selection = props.selection;
        this.boardId = props.boardId;
    }

    render(): JSX.Element{
        return (
            <div id={this.boardId} className={classes.rcsbFvBoard} style={this.configStyle()} onMouseLeave={this.setMouseLeaveBoardCallback()}>
                {this.props.boardConfigData.includeAxis ? this.getAxisRow(): null}
                {border(this.props.boardConfigData)}
                <SortableList lockAxis={"y"} onSortEnd={(oldIndex: number, newIndex: number)=>this.sortCallback({oldIndex,newIndex})} className={"list"} draggedItemClassName={"dragged"}>
                    {
                        this.state.order.filter((rowData: RcsbFvRowConfigInterface) =>{
                            return rowData.trackVisibility != false;
                        }).map((rowConfig: RcsbFvRowConfigInterface & {key:string}, n) =>{
                            const rowId: string = rowConfig.trackId;
                            const rowNumber: number = n + (this.props.boardConfigData.includeAxis ? 1 : 0);
                            this.props.rowStatusMap.set(rowId, false);
                            return (<SortableItem key={rowConfig.key}><div className={"item"}><RcsbFvRow
                                id={rowId}
                                boardId={this.boardId}
                                rowNumber={rowNumber}
                                rowConfigData={RowConfigFactory.getConfig(rowId,this.boardId,rowConfig,this.props.boardConfigData)}
                                xScale={this.xScale}
                                selection={this.selection}
                                contextManager={this.props.contextManager}
                                renderSchedule={ rowNumber == (this.props.boardConfigData.includeAxis ? 1 : 0) ? "sync" : "async"}
                            /></div></SortableItem>);
                        })
                    }
                </SortableList>
                {border(this.props.boardConfigData)}
            </div>
        );
    }

    componentDidMount(): void {
        this.subscription = this.subscribe();
    }

    componentDidUpdate(prevProps: Readonly<RcsbFvTableInterface>, prevState: Readonly<RcsbFvTableState>, snapshot?: any) {
        if( this.props.rowConfigData.map(rc=>rc.key).join("|") != this.state.order.map(rc=>rc.key).join("|") && prevState.order.map(rc=>rc.key).join("|") == this.state.order.map(rc=>rc.key).join("|"))
            this.setState({
                order:this.props.rowConfigData,
                axisKey:uniqid("rcsbFvAxis_key_")
            });
    }

    private sortCallback(move: {oldIndex: number, newIndex: number}): void {
        this.setState({order:arrayMove(this.state.order,move.oldIndex,move.newIndex)});
    }

    private setMouseLeaveBoardCallback(): (()=>void)|undefined{
        if(this.props.boardConfigData.highlightHoverPosition === true || typeof this.props.boardConfigData.highlightHoverCallback === "function")
            return this.mouseLeaveBoardCallback.bind(this);
        else
            return undefined;
    }

    private mouseLeaveBoardCallback(): void{
        if(this.props.boardConfigData.highlightHoverPosition === true){
            this.setSelection({
                elements:null,
                mode:'hover'
            });
        }
        if(this.props.boardConfigData.highlightHoverCallback){
            this.props.boardConfigData.highlightHoverCallback(this.selection.getSelected('hover').map(r=>r.rcsbFvTrackDataElement));
        }
    }

    /**Subscribe className to rxjs events (adding tracks, change scale, update board config)
     * @return rxjs Subscription object
     * */
    private subscribe(): Subscription{
        return this.props.contextManager.subscribe((obj:RcsbFvContextManagerInterface)=>{
            if(obj.eventType===EventType.ADD_TRACK){
                this.addRow(obj.eventData as RcsbFvRowConfigInterface);
            }else if(obj.eventType===EventType.TRACK_VISIBILITY){
                this.changeTrackVisibility(obj.eventData as TrackVisibilityInterface);
            }else if(obj.eventType===EventType.ADD_TRACK_DATA){
                this.addTrackData(obj.eventData as TrackDataInterface);
            }else if(obj.eventType===EventType.UPDATE_TRACK_DATA){
                this.updateTrackData(obj.eventData as TrackDataInterface);
            }else if(obj.eventType===EventType.DOMAIN_VIEW){
                this.setDomain(obj.eventData as DomainViewInterface);
            }else if(obj.eventType===EventType.SET_SELECTION){
                this.setSelection(obj.eventData as SetSelectionInterface);
            }else if(obj.eventType===EventType.ADD_SELECTION){
                this.addSelection(obj.eventData as SetSelectionInterface);
            }else if(obj.eventType===EventType.MOVE_TRACK){
                this.sortCallback( obj.eventData as MoveTrackInterface);
            }
        });
    }

    /**Update selection object
     * @param newSelection new selection object
     * */
    private setSelection(newSelection: SetSelectionInterface): void {
        if(newSelection?.elements != null){
            const list: Array<{begin:number; end?:number; isEmpty?:boolean;}> = newSelection.elements instanceof Array ? newSelection.elements : [newSelection.elements];
            this.selection.setSelected(list.map((x) => {
                    return {
                        domId: this.boardId,
                        rcsbFvTrackDataElement: {
                            begin: x.begin,
                            end: x.end,
                            isEmpty: x.isEmpty,
                            nonSpecific: true
                        }
                    };
                }),
                newSelection.mode
            );
        }else{
            this.selection.clearSelection(newSelection?.mode);
        }
        this.select(newSelection?.mode ?? 'select');
    }

    /**Add elements to selection object
     * @param newSelection new selection elements to be added
     * */
    private addSelection(newSelection: SetSelectionInterface): void {
        if(newSelection?.elements != null){
            const list: Array<{begin:number; end?:number; isEmpty?:boolean;}> = newSelection.elements instanceof Array ? newSelection.elements : [newSelection.elements];
            this.selection.addSelected(list.map((x) => {
                    return {
                        domId: this.boardId,
                        rcsbFvTrackDataElement: {
                            begin: x.begin,
                            end: x.end,
                            isEmpty: x.isEmpty,
                            nonSpecific: true
                        }
                    };
                }),
                newSelection.mode
            );
            this.select(newSelection?.mode ?? 'select');
        }
    }

    /**Force current selection in all tracks.*/
    private select(mode:'select'|'hover'): void{
        this.props.contextManager.next({
            eventType: EventType.SELECTION,
            eventData: {
                trackId: this.boardId,
                mode:mode
            }
        } as RcsbFvContextManagerInterface);
    }

    /**Update d3 xScale domain
     * @param domainData new xScale domain
     * */
    private setDomain(domainData: DomainViewInterface): void {
        this.xScale.domain(domainData.domain);
        this.setScale();
    }

    /**Replace board track rack data
     * @param obj New track data and target track id
     * */
    private updateTrackData(obj: TrackDataInterface, ): void{
        this.changeTrackData(obj,"replace");
    }

    /**Add new data to a given board track
     * @param obj Additional track data and target track id
     * */
    private addTrackData(obj: TrackDataInterface): void{
        this.changeTrackData(obj,"add");
    }

    /**Modifies a board track data
     * @param obj Additional track data and target track id
     * @param flag Replace track data or add data to the current one
     * */
    private changeTrackData(obj: TrackDataInterface, flag: "replace"|"add"): void{
        const rowConfigData: Array<RcsbFvRowConfigInterface> = this.props.rowConfigData;
        rowConfigData.forEach((rowConfig:RcsbFvRowConfigInterface)=>{
            if(rowConfig.trackId === obj.trackId){
                if(rowConfig.displayType != RcsbFvDisplayTypes.COMPOSITE) {
                    if(flag === "replace")
                        rowConfig.trackData = obj.trackData;
                    else if(flag === "add" && rowConfig.trackData instanceof Array)
                        rowConfig.trackData = rowConfig.trackData?.concat(obj.trackData);
                }
                else if(rowConfig.displayType === RcsbFvDisplayTypes.COMPOSITE && rowConfig.displayConfig instanceof Array)
                    rowConfig.displayConfig?.forEach((display: RcsbFvDisplayConfigInterface)=>{
                        if(display.displayId === obj.displayId){
                            if(flag === "replace")
                                display.displayData = obj.trackData;
                            else if(flag === "add" && display.displayData instanceof Array)
                                display.displayData = display.displayData?.concat(obj.trackData);
                        }
                    });
            }
        });
        //this.setState({rowConfigData: rowConfigData});
        this.setScale();
    }

    /**Modifies visibility of a board track
     * @param obj Target track id and visibility flag (true/false)
     * */
    private changeTrackVisibility(obj: TrackVisibilityInterface): void{
        const rowConfigData: Array<RcsbFvRowConfigInterface> = this.props.rowConfigData;
        rowConfigData.forEach((rowConfig:RcsbFvRowConfigInterface)=>{
            if(rowConfig.trackId === obj.trackId){
                rowConfig.trackVisibility = obj.visibility;
            }
        });
        //this.setState({rowConfigData: rowConfigData});
        this.setScale();
    }

    /**Adds a new track to the board
     * @param configRow Track configuration object
     * */
    private addRow(configRow: RcsbFvRowConfigInterface): void{
        const rowConfigData: Array<RcsbFvRowConfigInterface> = this.props.rowConfigData;
        rowConfigData.push(configRow);
        //this.setState({rowConfigData: rowConfigData});
        this.setScale();
    }

    /**Force all board track annotation cells to set xScale. Called when a new track has been added*/
    private setScale(): void{
        if(this.xScale!=null) {
            this.props.contextManager.next({
                eventType: EventType.SCALE,
                eventData: this.boardId
            } as RcsbFvContextManagerInterface);
        }
    }

    private getAxisRow(): JSX.Element {
        const rowId: string = "rcsbFvAxis_0";
        const rowConfig:RcsbFvRowConfigInterface = {displayType:RcsbFvDisplayTypes.AXIS, trackId:rowId, boardId:this.boardId};
        return(<RcsbFvRow
            key={this.state.axisKey}
            id={rowId}
            boardId={this.props.boardId}
            rowNumber={0}
            rowConfigData={RowConfigFactory.getConfig(rowId, this.boardId, rowConfig, this.props.boardConfigData)}
            xScale={this.xScale}
            selection={this.selection}
            contextManager={this.props.contextManager}
            renderSchedule={"fixed"}
        />);
    }

    /**Returns the full track width (title+annotations)
     * @return Board track full width
     * */
    private configStyle() : React.CSSProperties {
        let titleWidth : number = RcsbFvDefaultConfigValues.rowTitleWidth;
        if(typeof this.props.boardConfigData.rowTitleWidth === "number"){
            titleWidth = this.props.boardConfigData.rowTitleWidth;
        }
        let trackWidth : number = RcsbFvDefaultConfigValues.rowTitleWidth;
        if(typeof this.props.boardConfigData.trackWidth === "number"){
            trackWidth = this.props.boardConfigData.trackWidth;
        }
        return {
            width: (titleWidth+trackWidth+(this.props.boardConfigData.borderWidth ?? RcsbFvDefaultConfigValues.borderWidth)*2+RcsbFvDefaultConfigValues.titleAndTrackSpace)
        };
    }

}

function border(boardConfigData: RcsbFvBoardConfigInterface): JSX.Element {
    const height: number = RcsbFvDefaultConfigValues.borderWidth;
    return(<div
        style={{
            width: "100%",
            height
        }}
    ><div style={{
        width: boardConfigData.trackWidth,
        height:0,
        float:"right",
        borderTop: height + "px solid #DDD",
        borderLeft: RcsbFvDefaultConfigValues.borderWidth + "px solid #DDD",
        borderRight: RcsbFvDefaultConfigValues.borderWidth + "px solid #DDD"
    }}></div></div>);
}