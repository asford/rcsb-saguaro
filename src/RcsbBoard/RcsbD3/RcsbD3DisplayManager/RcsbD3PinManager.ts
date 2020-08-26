import {Selection, BaseType, select} from "d3-selection";
import {ScaleLinear} from "d3-scale";
import {RcsbD3Constants} from "../RcsbD3Constants";
import {RcsbFvTrackDataElementInterface} from "../../../RcsbDataManager/RcsbDataManager";

export interface PlotPinInterface {
    elements: Selection<SVGGElement,RcsbFvTrackDataElementInterface,BaseType,undefined>;
    radius: number;
    labelShift: number;
    xScale: ScaleLinear<number,number>;
    yScale: ScaleLinear<number,number>;
    height: number;
    color?: string;
    addLine?: boolean;
    addText?: boolean;
}

export interface MovePinInterface {
    labelShift: number;
    xScale: ScaleLinear<number,number>;
    yScale: ScaleLinear<number,number>;
    height: number;
    addLine?: boolean;
}

export class RcsbD3PinManager {

    private textElements: Selection<SVGTextElement, RcsbFvTrackDataElementInterface, BaseType, undefined> = select<SVGTextElement, RcsbFvTrackDataElementInterface>(RcsbD3Constants.EMPTY);
    private lineElements: Selection<SVGLineElement, RcsbFvTrackDataElementInterface, BaseType, undefined> = select<SVGLineElement, RcsbFvTrackDataElementInterface>(RcsbD3Constants.EMPTY);
    private circleElements: Selection<SVGCircleElement, RcsbFvTrackDataElementInterface, BaseType, undefined> = select<SVGCircleElement, RcsbFvTrackDataElementInterface>(RcsbD3Constants.EMPTY);

    plot(config: PlotPinInterface): void{
        const elements: Selection<SVGGElement,RcsbFvTrackDataElementInterface,BaseType,undefined> = config.elements;
        const xScale: ScaleLinear<number,number> = config.xScale;
        const yScale: ScaleLinear<number,number> = config.yScale;
        const height: number = config.height;
        const color: string = config.color != undefined ? config.color : "#CCCCCC";
        const radius: number = config.radius;
        const labelShift: number = config.labelShift;

        this.lineElements = elements.select(RcsbD3Constants.LINE);
        this.textElements = elements.select(RcsbD3Constants.TEXT);
        this.circleElements = elements.select(RcsbD3Constants.CIRCLE);

        this.circleElements.attr(RcsbD3Constants.CX, (d:RcsbFvTrackDataElementInterface) => {
                return xScale(d.begin);
            })
            .attr(RcsbD3Constants.CY, (d:RcsbFvTrackDataElementInterface) => {
                let y = 0.5;
                if(typeof d.value === "number") {
                    y = d.value;
                }
                return height - yScale(y);
            })
            .transition()
            .duration(500)
            .attr(RcsbD3Constants.R, radius)
            .attr(RcsbD3Constants.FILL, (d:RcsbFvTrackDataElementInterface) => {
                if(typeof d.color === "string")
                    return d.color;
                return color;
            });

        if(config.addLine) {
            this.lineElements.attr(RcsbD3Constants.X1, (d: RcsbFvTrackDataElementInterface) => {
                return xScale(d.begin);
            })
                .attr(RcsbD3Constants.Y1, (d: RcsbFvTrackDataElementInterface) => {
                    return height;
                })
                .attr(RcsbD3Constants.X2, (d: RcsbFvTrackDataElementInterface) => {
                    return xScale(d.begin);
                })
                .attr(RcsbD3Constants.Y2, (d: RcsbFvTrackDataElementInterface) => {
                    let y = 0.5;
                    if (typeof d.value === "number") {
                        y = d.value;
                    }
                    return height - yScale(y);
                });
        }else{
            this.lineElements.remove();
        }

        if(config.addText){
            this.textElements.attr(RcsbD3Constants.FONT_SIZE, 12)
                .attr(RcsbD3Constants.X, (d:RcsbFvTrackDataElementInterface) => {
                    return xScale(d.begin)+2.5*labelShift;
                })
                .attr(RcsbD3Constants.Y, (d:RcsbFvTrackDataElementInterface) => {
                    var y = 0.5;
                    if(typeof d.value === "number") {
                        y = d.value;
                    }
                    return height - yScale(y) + 0.5*labelShift;
                })
                .attr(RcsbD3Constants.TEXT_ANCHOR, "middle")
                .attr(RcsbD3Constants.FILL, (d:RcsbFvTrackDataElementInterface) => {
                    if(typeof d.color === "string")
                        return d.color;
                    return color;
                })
                .text((d:RcsbFvTrackDataElementInterface) => {
                    return d.label || "";
                });
        }else{
            this.textElements.remove();
        }
    }

    move(config: MovePinInterface): void{
        const xScale: ScaleLinear<number,number> = config.xScale;
        const yScale: ScaleLinear<number,number> = config.yScale;
        const height: number = config.height;
        const labelShift: number = config.labelShift;

        if(config.addLine) {
            this.lineElements.attr(RcsbD3Constants.X1, (d: RcsbFvTrackDataElementInterface) => {
                    return xScale(d.begin);
                })
                .attr(RcsbD3Constants.Y1, (d: RcsbFvTrackDataElementInterface) => {
                    return height;
                })
                .attr(RcsbD3Constants.X2, (d: RcsbFvTrackDataElementInterface) => {
                    return xScale(d.begin);
                })
                .attr(RcsbD3Constants.Y2, (d: RcsbFvTrackDataElementInterface) => {
                    var y = 0.5;
                    if (typeof d.value === "number") {
                        y = d.value;
                    }
                    return height - yScale(y);
                });
        }

        this.circleElements.attr(RcsbD3Constants.CX, (d:RcsbFvTrackDataElementInterface) => {
                return xScale(d.begin);
            })
            .attr(RcsbD3Constants.CY, (d:RcsbFvTrackDataElementInterface) => {
                var y = 0.5;
                if(typeof d.value === "number") {
                    y = d.value;
                }
                return height - yScale(y);
            });

        this.textElements.attr(RcsbD3Constants.X, (d:RcsbFvTrackDataElementInterface) => {
                return xScale(d.begin)+2.5*labelShift;
            })
            .text((d:RcsbFvTrackDataElementInterface) => {
                return d.label || "";
            });
    }
}
