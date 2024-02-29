import { computePosition, detectOverflow } from "@floating-ui/dom";
import React from "react";
import { Subscription } from "rxjs";
import classes from "../../../scss/RcsbFvRow.module.scss";
import { RcsbFvBoardConfigInterface, RcsbFvRowExtendedConfigInterface } from "../../RcsbFvConfig/RcsbFvConfigInterface";
import { RcsbFvDOMConstants } from "../../RcsbFvConfig/RcsbFvDOMConstants";
import { RcsbFvDefaultConfigValues } from "../../RcsbFvConfig/RcsbFvDefaultConfigValues";
import { EventType, RcsbFvContextManager } from "../../RcsbFvContextManager/RcsbFvContextManager";

interface BoardProgressInterface {
    readonly boardId:string;
    readonly boardConfigData: RcsbFvBoardConfigInterface;
    readonly contextManager: RcsbFvContextManager;
    readonly rowConfigData: Array<RcsbFvRowExtendedConfigInterface>;
}

export class BoardProgress extends React.Component <BoardProgressInterface> {

    private subscription: Subscription;
    private tooltipDiv: HTMLDivElement;
    private refDiv: HTMLDivElement;

    render() {
        return (<div id={this.props.boardId+RcsbFvDOMConstants.PROGRESS_DIV_DOM_ID_PREFIX} style={{position:"absolute", top:0, left:0, visibility:"hidden", minWidth:150}} className={classes.rowTrackBoardSatus} >LOADING <span/></div>);
    }

    componentDidMount(): void {
        this.subscription = this.subscribe();
        const refDiv: HTMLDivElement | null= this.props.contextManager.root.querySelector("#"+this.props.boardId);
        console.log("reflookup", this.props.contextManager.root, refDiv)
        if(refDiv == null)
            throw "BoardProgress Main board DOM element not found";
        this.refDiv = refDiv;
        const tooltipDiv: HTMLDivElement  | null= this.props.contextManager.root.querySelector("#"+this.props.boardId+RcsbFvDOMConstants.PROGRESS_DIV_DOM_ID_PREFIX);
        if(tooltipDiv == null)
            throw "Tooltip DOM element not found";
        this.tooltipDiv = tooltipDiv;
    }

    componentWillUnmount() {
        this.subscription.unsubscribe();
    }


    private subscribe(): Subscription{
        return this.props.contextManager.subscribe((o)=>{
            switch (o.eventType){
                case EventType.FRACTION_COMPLETED:
                    this.rowReady(o.eventData);
                    break;
            }
        });
    }

    /**Row Track Board Ready Event
     * @param fraction
     * */
    private rowReady(fraction: number):void{
        if(fraction  >= 100){
            this.statusComplete();
        }else{
            if(this.tooltipDiv.style.visibility == 'hidden')
                this.showStatus();
            const statusDiv : HTMLElement | null = this.props.contextManager.root.querySelector("#"+this.props.boardId+RcsbFvDOMConstants.PROGRESS_DIV_DOM_ID_PREFIX+" > span");
            if(statusDiv != null)
                statusDiv.innerHTML = fraction.toString()+"%";
        }
    }

    private showStatus(): void{
        const offsetHeight: number = this.props.boardConfigData.includeAxis === true ? 0 : -RcsbFvDefaultConfigValues.trackAxisHeight - 2;
        computePosition(this.refDiv,this.tooltipDiv,{
            placement:'right-start',
            middleware:[{
                name: 'middleware',
                async fn(middlewareArguments) {
                    const overflow = await detectOverflow(middlewareArguments,{
                        rootBoundary: "viewport"
                    });
                    if(overflow.top > offsetHeight)
                        return {y:overflow.top+middlewareArguments.y - offsetHeight};
                    return {};
                },
            }]
        }).then(({x, y}) => {
            Object.assign(this.tooltipDiv.style, {
                left: `${x}px`,
                top: `${y+offsetHeight}px`,
                visibility: 'visible'
            });
        });
    }

    private statusComplete(){
        this.tooltipDiv.style.visibility = "hidden";
    }

}